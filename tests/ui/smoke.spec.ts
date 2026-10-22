// Playwright smoke (GAME-STANDARD §9: the old games get the hub shell only and are not rewritten).
// index.html opens at /konstantinos/ under the hub's CSP with 0 console errors and shows 🏠 + 🔊 of hub-shell.js;
// the quiz plays to the victory by keyboard only; on a tablet one question is played by tap.
import { expect, test, type Page } from '@playwright/test';
import { TOTAL, URL, correctIndex, watch } from './helpers';

/** Presses Tab until the focused element matches `selector` (keyboard only, like a child without a mouse). */
async function tabTo(page: Page, selector: string, max = 30) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate((s) => !!document.activeElement?.matches(s), selector)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${selector}`);
}

test('index opens under the hub CSP with 0 console errors; quiz to victory by keyboard only', async ({ page }) => {
  test.setTimeout(90_000); // 15 questions (0.8 s each) + the 8.7 s victory sequence, twice the start
  const problems = await watch(page);
  const res = await page.goto(URL);
  expect(res?.status()).toBe(200);
  expect(res?.headers()['content-security-policy']).toContain("default-src 'none'");
  await expect(page.locator('#hub-shell')).toBeVisible();
  const home = page.getByRole('link', { name: 'Πίσω στα παιχνίδια' });
  await expect(home).toBeVisible();
  await expect(home).toHaveText('🏠');
  await expect(home).toHaveAttribute('href', '/');
  const sound = page.locator('#hub-shell button[aria-label="Ήχος"]');
  await expect(sound).toBeVisible();
  await expect(sound).toHaveText('🔊');

  await tabTo(page, '#startQuizBtn');
  await page.keyboard.press('Enter');
  await expect(page.locator('#quizScreen')).toBeVisible();

  for (let q = 1; q <= TOTAL; q++) {
    await expect(page.locator('#progressLabel')).toHaveText(`Ερώτηση ${q} από ${TOTAL}`);
    await expect(page.locator('#questionText')).toBeFocused(); // the game moves focus to each new question
    const c = await correctIndex(page);
    await tabTo(page, `#answersGrid .btn-answer:nth-child(${c + 1})`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#feedbackText')).toHaveText('✅ ΣΩΣΤΟ ΗΡΩΑ!');
  }

  await expect(page.locator('#victoryMarvel')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#victoryOlymp')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#victoryJoke')).toBeVisible({ timeout: 10_000 });
  await tabTo(page, '#restartQuizBtn');
  await page.keyboard.press('Enter');
  await expect(page.locator('#progressLabel')).toHaveText(`Ερώτηση 1 από ${TOTAL}`);
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test.describe('touch', () => {
  test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });

  test('tablet 1180x820 plays one question by tap', async ({ page }) => {
    const problems = await watch(page);
    await page.goto(URL);
    await page.locator('#startQuizBtn').tap();
    await expect(page.locator('#progressLabel')).toHaveText(`Ερώτηση 1 από ${TOTAL}`);

    // A wrong tap: «try again», the same question comes back.
    const question = await page.locator('#questionText').textContent();
    const c = await correctIndex(page);
    const answers = page.locator('#answersGrid .btn-answer');
    await expect(answers).toHaveCount(4);
    await answers.nth(c === 0 ? 1 : 0).tap();
    await expect(page.locator('#feedbackText')).toHaveText('❌ Όχι! Δοκίμασε ξανά!');
    await expect(page.locator('#feedbackText')).toHaveText('');
    await expect(page.locator('#questionText')).toHaveText(question ?? '');

    // Every answer is a comfortable target for a child's finger (44 x 44 CSS px, WCAG 2.5.5).
    for (let i = 0; i < 4; i++) {
      const box = await answers.nth(i).boundingBox();
      expect(box && box.width >= 44 && box.height >= 44, `answer ${i + 1} is at least 44x44`).toBeTruthy();
    }

    await answers.nth(await correctIndex(page)).tap();
    await expect(page.locator('#feedbackText')).toHaveText('✅ ΣΩΣΤΟ ΗΡΩΑ!');
    await expect(page.locator('#progressLabel')).toHaveText(`Ερώτηση 2 από ${TOTAL}`);
    expect(problems).toEqual([]);
  });
});
