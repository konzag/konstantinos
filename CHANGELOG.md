# Changelog

## 2026-10-22: try-again text contrast (KONSTANTINOS-T1)

- `index.html`: `.feedback-text.wrong` colour `#ff8a8a` → `#ffc2c2`. The red «❌ Όχι! Δοκίμασε ξανά!» feedback
  on the wrong-answer card (`--wrong-bg #7b1111` + glow) measured 3.94:1 in axe (WCAG 1.4.3 needs 4.5:1 for
  17.6 px bold text) and now passes.
- **Owner-approved exception to GAME-STANDARD §9** (owner decision 9, 2026-10-22): §9 normally keeps the kids'
  code untouched. Only this one colour value changed. Text, layout, logic and the Python program are not touched.
- `tests/ui/axe.spec.ts`: the four `try-again` expected failures (`test.fail`, KONSTANTINOS-T1) are removed, so the
  axe check is strict on every screen (light + dark, 360 + 1280 px). These four tests fail on the old colour.
- Test count unchanged (41 = 8 node + 15 python + 18 playwright, `.coverage-floor` 41).
