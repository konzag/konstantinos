// hub-shell.test.mjs — έλεγχοι για το «κέλυφος» του hub (GAME-STANDARD §9). Τρέχει με: node tests/hub-shell.test.mjs
//   1. Κάθε σελίδα .html φορτώνει πρώτα το assets/hub-shell.js (με το σωστό σχετικό μονοπάτι).
//   2. Καμία σελίδα και κανένα .css δεν ζητά κάτι από το Google Fonts (όλα τοπικά, από το hub).
//   3. Το κουμπί 🔊 σβήνει πραγματικά τον ήχο κάθε AudioContext και το θυμάται.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || e.name === 'node_modules') return [];
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
const files = walk(root).map((f) => path.relative(root, f).split(path.sep).join('/'));
const pages = files.filter((f) => f.endsWith('.html'));
assert.ok(pages.includes('index.html'), 'index.html exists');

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const prefix = '../'.repeat(page.split('/').length - 1);
  const first = html.match(/<script\b[^>]*>/i);
  assert.ok(first, `${page}: has a <script>`);
  assert.match(first[0], new RegExp(`src="${prefix.replace(/\./g, '\\.')}assets/hub-shell\\.js"`), `${page}: hub-shell.js is the first script`);
  assert.match(first[0], /data-game="[a-z-]+"/, `${page}: data-game set`);
}
for (const file of files.filter((f) => /\.(html|css)$/.test(f))) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(text, /fonts\.googleapis|fonts\.gstatic/, `${file}: no Google Fonts`);
}

// --- Το hub-shell.js σε ψεύτικο browser: AudioContext, localStorage, DOM ---
function fakeBrowser(stored) {
  const storage = new Map(Object.entries(stored));
  const made = [];
  class FakeAudioContext {
    constructor() {
      this.destination = { speakers: true };
      made.push(this);
    }
    createGain() {
      return { gain: { value: 1 }, connect(to) { this.to = to; } };
    }
  }
  const element = (tag) => ({
    tag, style: {}, children: [], attrs: {}, listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { this.children.push(c); },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  });
  const body = element('body');
  const window = {
    AudioContext: FakeAudioContext,
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) },
  };
  window.document = {
    currentScript: { dataset: { game: 'test' } },
    body,
    getElementById: () => null,
    createElement: element,
    addEventListener() {},
  };
  return { window, storage, made, body, FakeAudioContext };
}

const code = fs.readFileSync(path.join(root, 'assets/hub-shell.js'), 'utf8');
const run = (b) => vm.runInNewContext(code, { window: b.window, document: b.window.document, localStorage: b.window.localStorage, String });

const b = fakeBrowser({});
run(b);
const ctx = new b.window.AudioContext();
assert.ok(ctx instanceof b.FakeAudioContext, 'instanceof still works');
assert.equal(ctx.destination.to.speakers, true, 'the switch sits between the game and the speakers');
const [home, sound] = b.body.children[0].children;
assert.equal(home.href, '/', '🏠 goes to the hub');
assert.equal(sound.textContent, '🔊');
sound.listeners.click();
assert.equal(ctx.destination.gain.value, 0, 'muted');
assert.equal(b.storage.get('game.test.sound'), 'off', 'remembered');
assert.equal(sound.textContent, '🔇');

const again = fakeBrowser({ 'game.test.sound': 'off' });
run(again);
assert.equal(new again.window.AudioContext().destination.gain.value, 0, 'starts muted after a reload');

const broken = fakeBrowser({});
broken.window.localStorage.getItem = () => { throw new Error('denied'); };
broken.window.localStorage.setItem = () => { throw new Error('denied'); };
run(broken);
broken.body.children[0].children[1].listeners.click(); // no crash without storage

console.log(`hub-shell: ${pages.length} pages OK`);
