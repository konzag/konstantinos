# Changelog

## 2026-11-16: the hub shell in Greek and English (Block 7, owner 02/11)

- `assets/hub-shell.js`: a third round button next to 🏠 and 🔊 switches the shell language: «EN» while Greek,
  «ΕΛ» while English. The 🏠 / 🔊 labels (title + aria-label) follow it: «Πίσω στα παιχνίδια» / «Back to games»,
  «Ήχος» / «Sound». The choice is kept on the device in `games.lang` (one key for every game of the hub, try/catch,
  Greek when unset or invalid). Only the shell changes language: the quiz stays Greek and `<html lang>` is untouched
  (GAME-STANDARD §9); the bar carries its own `lang`.
- Tests: `tests/hub-shell-lang.test.mjs` (5 node tests) and `tests/ui/lang.spec.ts` (5 browser tests: default Greek,
  switch + persist + reload, invalid value, storage that throws, axe on the bar in English), red on the old shell.
  K9 `el-en-strings` is now present (allowlist entry removed). Test count 44 → 54, `.coverage-floor` 44 → 54.

## 2026-11-11: privacy, no child age or class in this public repo (owner decision L4-29)

- README, CLAUDE.md and the docstring of `konstantinos.py` no longer state an age or a school class. The quiz itself
  is unchanged. `tests/no-child-age.test.mjs` scans every text file so it stays that way.

## 2026-10-22: try-again text contrast (KONSTANTINOS-T1)

- `index.html`: `.feedback-text.wrong` colour `#ff8a8a` → `#ffc2c2`. The red «❌ Όχι! Δοκίμασε ξανά!» feedback
  on the wrong-answer card (`--wrong-bg #7b1111` + glow) measured 3.94:1 in axe (WCAG 1.4.3 needs 4.5:1 for
  17.6 px bold text) and now passes.
- **Owner-approved exception to GAME-STANDARD §9** (owner decision 9, 2026-10-22): §9 normally keeps the kids'
  code untouched. Only this one colour value changed. Text, layout, logic and the Python program are not touched.
- `tests/ui/axe.spec.ts`: the four `try-again` expected failures (`test.fail`, KONSTANTINOS-T1) are removed, so the
  axe check is strict on every screen (light + dark, 360 + 1280 px). These four tests fail on the old colour.
- Test count unchanged (41 = 8 node + 15 python + 18 playwright, `.coverage-floor` 41).
