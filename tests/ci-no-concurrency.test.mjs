// ci-no-concurrency.test.mjs — CI-NO-CONCURRENCY (owner 2026-11-15): the CI workflow has no `concurrency`
// (workflow- or job-level), so a run is never left «pending» by a group GitHub did not release
// (logvault 4e6fa59, 2026-11-14). Every workflow file counts (this repo has no automerge.yml).
// Run: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKFLOWS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');

test('CI workflows have no concurrency key', () => {
  const files = fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f)).sort();
  assert.ok(files.includes('ci.yml'), 'the CI workflow is missing');
  const offenders = files.filter((f) => /^\s*concurrency\s*:/m.test(fs.readFileSync(path.join(WORKFLOWS, f), 'utf8')));
  assert.deepEqual(offenders, []);
});
