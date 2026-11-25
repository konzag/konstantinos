// no-own-service-worker.test.mjs: offline play comes from the games-hub service worker (games-hub ADR-0008, owner
// decision 2026-11-16). The hub precaches every file of this repo and adds the install manifest itself, so no page or
// script here may register a service worker of its own (it would take the scope /<slug>/ away from the hub's worker)
// or link its own manifest. Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Folders the hub never serves (installs, local test output, the tests themselves).
const SKIP = new Set([".git", ".github", "node_modules", ".venv", "venv", "test-results", "playwright-report", "__pycache__", "tests"]);
const SERVED = /\.(html?|js)$/i;
const RULES = [
  ["registers a service worker", /serviceWorker\s*\.\s*register|navigator\s*\.\s*serviceWorker/],
  ["links its own manifest", /<link\b[^>]*\brel\s*=\s*["']?manifest\b/i],
];

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (SERVED.test(e.name)) yield p;
  }
}

test("no served page or script registers its own service worker or links its own manifest", () => {
  const hits = [];
  let scanned = 0;
  for (const f of files(ROOT)) {
    scanned++;
    const text = readFileSync(f, "utf8");
    for (const [what, re] of RULES) if (re.test(text)) hits.push(`${relative(ROOT, f)}: ${what}`);
  }
  assert.ok(scanned > 0, "no .html/.js file found");
  assert.deepEqual(hits, []);
});

test("the rules catch a registration and a manifest link", () => {
  assert.ok(RULES[0][1].test("navigator.serviceWorker.register('/sw.js')"));
  assert.ok(RULES[1][1].test('<link rel="manifest" href="m.json">'));
  assert.ok(!RULES[1][1].test('<link rel="stylesheet" href="a.css">'));
});
