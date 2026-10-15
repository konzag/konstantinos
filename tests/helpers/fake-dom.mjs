// fake-dom.mjs — a tiny, dependency-free "browser" for the button tests.
//
// It reads a page, builds one fake element for every tag in the HTML (id, class, data-*), then runs the page's
// own scripts (inline <script> blocks and local <script src>, in page order) inside a node:vm context.
// Anything the games touch that we do not model (canvas, Web Audio, speech, ...) is a forgiving "stub" that
// accepts any call, so the page code runs without errors. Timers are fake: clock.advance(ms) runs them.
//
// Used by tests/no-inline-handlers.test.mjs: click a button, check that the right game function ran.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// A stub that swallows everything: stub.a.b(), new stub(), stub + 1, for (x of stub) ... all work.
const stubTarget = function stub() {};
export const stub = new Proxy(stubTarget, {
  get(target, prop) {
    if (prop === Symbol.toPrimitive) return () => 0;
    if (prop === 'then') return undefined; // not a Promise
    return stub;
  },
  set() { return true; },
  apply() { return stub; },
  construct() { return stub; },
});

function parseAttrs(text) {
  const attrs = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(text))) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return attrs;
}

class FakeElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.id = attrs.id || '';
    this.className = attrs.class || '';
    this.dataset = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    this.style = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; }, getPropertyValue(k) { return this[k] ?? ''; } };
    this.listeners = {};
    this.children = [];
    this.textContent = '';
    this._html = '';
    this.value = attrs.value || '';
    this.disabled = 'disabled' in attrs;
    this.hidden = 'hidden' in attrs;
    const self = this;
    this.classList = {
      _list: () => self.className.split(/\s+/).filter(Boolean),
      add(...c) { self.className = [...new Set([...this._list(), ...c])].join(' '); },
      remove(...c) { self.className = this._list().filter((x) => !c.includes(x)).join(' '); },
      contains(c) { return this._list().includes(c); },
      toggle(c, force) {
        const on = force === undefined ? !this.contains(c) : force;
        if (on) this.add(c); else this.remove(c);
        return on;
      },
    };
  }
  // Setting innerHTML replaces the content, so the old children are gone (like in a browser).
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = String(v); if (k === 'class') this.className = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return k in this.attributes; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
  appendChild(child) { this.children.push(child); return child; }
  append(...c) { this.children.push(...c); }
  // Fire an event on this element, like a real tap/click would (this === element, one event argument).
  dispatch(type, extra = {}) {
    const event = { type, target: this, currentTarget: this, preventDefault() {}, stopPropagation() {}, ...extra };
    for (const fn of this.listeners[type] || []) fn.call(this, event);
    return event;
  }
  click() { if (!this.disabled) this.dispatch('click'); }
}

// Unknown properties/methods of an element fall back to the stub (e.g. el.getContext('2d'), el.focus()).
function wrap(el) {
  return new Proxy(el, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      return stub;
    },
  });
}

function matches(el, selector) {
  const sel = selector.trim();
  if (!sel || /[\s>+~:]/.test(sel.replace(/\[[^\]]*\]/g, ''))) return false; // only simple selectors
  const parts = sel.match(/(^[a-zA-Z][\w-]*)|#[\w-]+|\.[\w-]+|\[[^\]]+\]/g) || [];
  return parts.every((p) => {
    if (p[0] === '#') return el.id === p.slice(1);
    if (p[0] === '.') return el.classList.contains(p.slice(1));
    if (p[0] === '[') {
      const m = p.slice(1, -1).match(/^([\w-]+)(?:="?([^"]*)"?)?$/);
      if (!m) return false;
      return m[2] === undefined ? m[1] in el.attributes : el.attributes[m[1]] === m[2];
    }
    return el.tagName === p.toUpperCase();
  });
}

export function loadPage(root, page) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, 'utf8');
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

  const all = [];
  const byId = new Map();
  const make = (tag, attrs) => {
    const el = wrap(new FakeElement(tag, attrs));
    all.push(el);
    if (el.id && !byId.has(el.id)) byId.set(el.id, el);
    return el;
  };
  for (const m of withoutScripts.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) make(m[1], parseAttrs(m[2]));

  // --- fake timers ---
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const clock = {
    get now() { return now; },
    advance(ms) {
      const end = now + ms;
      for (let guard = 0; guard < 100000; guard++) {
        let due = null;
        for (const [id, t] of timers) if (t.at <= end && (!due || t.at < due[1].at)) due = [id, t];
        if (!due) break;
        const [id, t] = due;
        now = t.at;
        if (t.every) t.at += t.every; else timers.delete(id);
        t.fn(...t.args);
      }
      now = end;
    },
  };
  const setTimer = (every) => (fn, ms = 0, ...args) => {
    const id = nextId++;
    if (typeof fn === 'function') timers.set(id, { fn, args, at: now + Math.max(0, Number(ms) || 0), every: every ? Math.max(1, Number(ms) || 1) : 0 });
    return id;
  };

  const storage = () => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      get length() { return map.size; },
    };
  };

  const docListeners = {};
  const body = byId.get('__body') || all.find((e) => e.tagName === 'BODY') || make('body', {});
  const document = {
    body,
    documentElement: all.find((e) => e.tagName === 'HTML') || make('html', {}),
    head: all.find((e) => e.tagName === 'HEAD') || make('head', {}),
    readyState: 'complete',
    currentScript: null,
    getElementById: (id) => byId.get(id) || null,
    querySelectorAll: (sel) => all.filter((el) => sel.split(',').some((s) => matches(el, s))),
    querySelector: (sel) => all.find((el) => sel.split(',').some((s) => matches(el, s))) || null,
    getElementsByClassName: (c) => all.filter((el) => el.classList.contains(c)),
    getElementsByTagName: (t) => all.filter((el) => el.tagName === t.toUpperCase()),
    createElement: (tag) => make(tag, {}),
    createElementNS: (_ns, tag) => make(tag, {}),
    createTextNode: (text) => ({ textContent: text }),
    createDocumentFragment: () => make('fragment', {}),
    addEventListener: (type, fn) => (docListeners[type] ||= []).push(fn),
    removeEventListener() {},
    hidden: false,
    visibilityState: 'visible',
    fullscreenElement: null,
    activeElement: null,
  };

  const context = {
    document,
    console,
    Math, JSON, Date, Number, String, Array, Object, Boolean, RegExp, Error, Map, Set, Promise, Symbol, Intl,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    setTimeout: setTimer(false), setInterval: setTimer(true),
    clearTimeout: (id) => timers.delete(id), clearInterval: (id) => timers.delete(id),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    localStorage: storage(), sessionStorage: storage(),
    navigator: { userAgent: 'node', maxTouchPoints: 0, vibrate() {}, language: 'el' },
    location: { href: 'http://localhost/', pathname: '/', search: '', hash: '', reload() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    performance: { now: () => now },
    alert() {}, confirm: () => true, prompt: () => null,
    AudioContext: stub, webkitAudioContext: stub, Audio: stub, Image: stub,
    speechSynthesis: stub, SpeechSynthesisUtterance: stub, ResizeObserver: stub, IntersectionObserver: stub,
    getComputedStyle: () => stub,
    scrollTo() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {},
  };
  context.window = context;
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);

  // Run the page's scripts in order. hub-shell.js has its own test (tests/hub-shell.test.mjs).
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = parseAttrs(m[1]);
    if (attrs.src) {
      if (/^(https?:)?\/\//.test(attrs.src) || attrs.src.endsWith('hub-shell.js')) continue;
      const src = path.join(path.dirname(file), attrs.src);
      vm.runInContext(fs.readFileSync(src, 'utf8'), context, { filename: path.relative(root, src) });
    } else {
      vm.runInContext(m[2], context, { filename: page });
    }
  }
  for (const fn of docListeners.DOMContentLoaded || []) fn({ type: 'DOMContentLoaded' });

  return { window: context, document, clock, all };
}

// Replace a global game function with a recorder; returns the list of calls (each = the arguments array).
export function spyOn(win, name) {
  const calls = [];
  if (typeof win[name] !== 'function') throw new Error(`${name} is not a global function`);
  win[name] = (...args) => { calls.push(args); };
  return calls;
}

// Every served file (.html/.js) of the repo, without tests/, node_modules and dot-folders.
export function servedFiles(root) {
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tests') return [];
      const full = path.join(dir, e.name);
      return e.isDirectory() ? walk(full) : [full];
    });
  return walk(root)
    .filter((f) => /\.(html?|m?js)$/i.test(f))
    .map((f) => path.relative(root, f).split(path.sep).join('/'));
}

// Inline handler attributes (onclick="…", onload='…', onchange=…) in markup or in JS-generated markup strings.
const EVENTS =
  '(?:click|dblclick|auxclick|contextmenu|change|input|submit|reset|invalid|select|load|unload|beforeunload|error|' +
  'abort|focus|focusin|focusout|blur|scroll|resize|wheel|copy|cut|paste|play|pause|ended|' +
  '(?:mouse|key|touch|pointer|drag|animation|transition)[a-z]*|drop)';
export const INLINE_HANDLER = new RegExp(
  `<[a-zA-Z][^>]*?\\son${EVENTS}\\s*=|[\\s"'\`]on${EVENTS}\\s*=\\s*["'\\\\\`]`,
  'i',
);

// All inline handlers left in the served files, as "file:line: match" (empty list = CSP-clean).
export function findInlineHandlers(root) {
  const global = new RegExp(INLINE_HANDLER.source, 'gi');
  return servedFiles(root).flatMap((f) => {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    return [...text.matchAll(global)].map((m) => `${f}:${text.slice(0, m.index).split('\n').length}: ${m[0]}`);
  });
}
