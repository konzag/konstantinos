// axe-core on the start, question, «try again» and victory screens: serious/critical violations = 0, light + dark,
// 360 px (phone) and 1280 px (desktop). Report only: a violation in the kids' code is not fixed here
// (GAME-STANDARD §9) but marked test.fail('APP BUG KONSTANTINOS-T<n>: ...') and listed in
// D:\Git\.claude\FIX-KONSTANTINOS-TESTBUGS-2026-10-22.md.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { URL, correctIndex } from './helpers';

// "<screen> <scheme> <width>" -> known app bug (the test must fail until the fix run removes the entry).
// Empty: KONSTANTINOS-T1 (try-again text contrast) was fixed by a colour-only change (owner decision 9, 2026-10-22).
const KNOWN: Record<string, string> = {};

async function seriousOrCritical(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

/** Puts the page on a screen the way a child gets there: start button, then right answers. */
const SCREENS: Record<string, (page: Page) => Promise<string[]>> = {
  start: async (page) => {
    await expect(page.locator('#startQuizBtn')).toBeVisible();
    return seriousOrCritical(page);
  },
  question: async (page) => {
    await page.locator('#startQuizBtn').click();
    await expect(page.locator('#answersGrid .btn-answer')).toHaveCount(4);
    return seriousOrCritical(page);
  },
  // The same screen right after a wrong answer (red card + red feedback text, 0.9 s until the question is back).
  'try-again': async (page) => {
    await page.locator('#startQuizBtn').click();
    await page.locator('#answersGrid .btn-answer').nth((await correctIndex(page)) === 0 ? 1 : 0).click();
    await expect(page.locator('#feedbackText')).toHaveText('❌ Όχι! Δοκίμασε ξανά!');
    return seriousOrCritical(page);
  },
  victory: async (page) => {
    await page.locator('#startQuizBtn').click();
    for (let q = 1; q <= 15; q++) {
      await expect(page.locator('#progressLabel')).toHaveText(`Ερώτηση ${q} από 15`);
      await page.locator('#answersGrid .btn-answer').nth(await correctIndex(page)).click();
      await page.clock.runFor(1_000);
    }
    // showVictory: +600 Marvel, +3000 «but wait», +1200 Olympiakos, +3000 the joke with the replay button.
    await page.clock.runFor(700);
    await expect(page.locator('#victoryMarvel')).toBeVisible();
    const bad = (await seriousOrCritical(page)).map((v) => `marvel: ${v}`);
    await page.clock.runFor(4_200);
    await expect(page.locator('#victoryOlymp')).toBeVisible();
    bad.push(...(await seriousOrCritical(page)).map((v) => `olympiakos: ${v}`));
    await page.clock.runFor(3_000);
    await expect(page.locator('#victoryJoke')).toBeVisible();
    bad.push(...(await seriousOrCritical(page)).map((v) => `joke: ${v}`));
    return bad;
  },
};

for (const [screen, reach] of Object.entries(SCREENS)) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [360, 1280]) {
      const id = `${screen} ${scheme} ${width}`;
      test(`axe serious/critical = 0: ${id}`, async ({ page }) => {
        if (KNOWN[id]) test.fail(true, KNOWN[id]);
        await page.clock.install(); // fake timers: the victory sequence without waiting 9 s
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(URL);
        await page.waitForLoadState('networkidle');
        expect(await reach(page)).toEqual([]);
      });
    }
  }
}
