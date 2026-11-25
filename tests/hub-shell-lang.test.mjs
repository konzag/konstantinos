// hub-shell-lang.test.mjs — η γλώσσα του κελύφους (EL + EN) σε ψεύτικο browser. Τρέχει με: node --test tests/
// Το κέλυφος δείχνει τα κουμπιά στα ελληνικά ή στα αγγλικά· το κλειδί games.lang είναι κοινό για όλα τα παιχνίδια.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = fs.readFileSync(path.join(root, 'assets/hub-shell.js'), 'utf8');

function boot(stored, { broken = false } = {}) {
  const storage = new Map(Object.entries(stored));
  const element = (tag) => ({
    tag, style: {}, children: [], attrs: {}, listeners: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    appendChild(c) { this.children.push(c); },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  });
  const body = element('body');
  const localStorage = broken
    ? { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }
    : { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) };
  const document = {
    currentScript: { dataset: { game: 'test' } }, body, getElementById: () => null, createElement: element,
    addEventListener() {},
  };
  vm.runInNewContext(code, { window: { localStorage, document }, document, localStorage, String });
  const bar = body.children[0];
  const [home, sound, lang] = bar.children;
  return { storage, bar, home, sound, lang };
}

test('Greek labels by default, the button offers English', () => {
  const s = boot({});
  assert.equal(s.bar.attrs.lang, 'el');
  assert.equal(s.home.attrs['aria-label'], 'Πίσω στα παιχνίδια');
  assert.equal(s.home.title, 'Πίσω στα παιχνίδια');
  assert.equal(s.sound.attrs['aria-label'], 'Ήχος');
  assert.equal(s.lang.textContent, 'EN');
  assert.equal(s.lang.attrs['aria-label'], 'EN · English');
});

test('the language button switches to English at once and remembers games.lang', () => {
  const s = boot({});
  s.lang.listeners.click();
  assert.equal(s.bar.attrs.lang, 'en');
  assert.equal(s.home.attrs['aria-label'], 'Back to games');
  assert.equal(s.sound.attrs['aria-label'], 'Sound');
  assert.equal(s.lang.textContent, 'ΕΛ');
  assert.equal(s.lang.attrs['aria-label'], 'ΕΛ · Ελληνικά');
  assert.equal(s.storage.get('games.lang'), 'en');
  s.lang.listeners.click();
  assert.equal(s.home.attrs['aria-label'], 'Πίσω στα παιχνίδια');
  assert.equal(s.storage.get('games.lang'), 'el');
});

test('a stored English choice is used after a reload; the sound switch is untouched', () => {
  const s = boot({ 'games.lang': 'en' });
  assert.equal(s.home.attrs['aria-label'], 'Back to games');
  assert.equal(s.sound.textContent, '🔊');
  assert.equal(s.sound.attrs['aria-pressed'], 'true');
});

test('an invalid stored value means Greek', () => {
  const s = boot({ 'games.lang': 'fr' });
  assert.equal(s.bar.attrs.lang, 'el');
  assert.equal(s.home.attrs['aria-label'], 'Πίσω στα παιχνίδια');
});

test('without localStorage the shell is Greek and the button still switches', () => {
  const s = boot({}, { broken: true });
  assert.equal(s.home.attrs['aria-label'], 'Πίσω στα παιχνίδια');
  s.lang.listeners.click();
  assert.equal(s.home.attrs['aria-label'], 'Back to games');
});
