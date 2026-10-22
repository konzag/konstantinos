#!/usr/bin/env bash
# Test-count floor (TEST-STANDARD v1 §R-JS fallback + §R-PY note): node coverage cannot see the page script that the
# tests run in node:vm, and Python line coverage needs coverage.py (this repo is stdlib only), so the ratchet here is
# the number of tests instead of a coverage percentage.
#
# Usage: tools/test-count-check.sh        (from the repo root; tests/ui needs `npm ci` first; PYTHON=python3 default)
#   count = node tests (`node --test tests/*.test.mjs`, line `tests N`)
#         + Python tests (`python3 -m unittest discover -s tests`, line `Ran N tests`)
#         + Playwright tests (`npx playwright test --list` in tests/ui, line `Total: M tests`)
#   fails when count < the floor in .coverage-floor, or when a count cannot be read (fail closed).
# The floor itself only goes up: tools/coverage-floor-check.sh compares .coverage-floor with the base branch.
set -euo pipefail
cd "$(dirname "$0")/.."

floor=$(grep -oE '^[0-9]+' .coverage-floor | head -1 || true)
[ -n "$floor" ] || { echo "::error::test-count-check: no number in .coverage-floor"; exit 2; }

# spec reporter: `ℹ tests N`; TAP reporter (older Node without a TTY): `# tests N`
node_out=$(node --test --test-reporter=spec tests/*.test.mjs 2>&1 || true)
node_n=$(sed -nE 's/^(ℹ|#) tests ([0-9]+)$/\2/p' <<<"$node_out" | tail -1)
py_out=$("${PYTHON:-python3}" -m unittest discover -s tests 2>&1 || true)
py_n=$(sed -nE 's/^Ran ([0-9]+) tests? in .*/\1/p' <<<"$py_out" | tail -1)
pw_out=$( (cd tests/ui && npx playwright test --list) 2>&1 || true)
pw_n=$(sed -nE 's/^Total: ([0-9]+) tests? in .*/\1/p' <<<"$pw_out" | tail -1)

if [ -z "$node_n" ] || [ -z "$py_n" ] || [ -z "$pw_n" ]; then
  echo "::error::test-count-check: could not count the tests (node: '${node_n}', python: '${py_n}', playwright: '${pw_n}')"
  printf '%s\n' "$node_out" | tail -5; printf '%s\n' "$py_out" | tail -5; printf '%s\n' "$pw_out" | tail -5
  exit 2
fi

count=$((node_n + py_n + pw_n))
echo "test count: node ${node_n} + python ${py_n} + playwright ${pw_n} = ${count} (floor ${floor})"
if [ "$count" -lt "$floor" ]; then
  echo "::error::test count ${count} is below the floor ${floor} (.coverage-floor): a test was removed"
  exit 1
fi
