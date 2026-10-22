// Shared by smoke.spec.ts and axe.spec.ts.
import type { Page } from '@playwright/test';

export const URL = '/konstantinos/';
export const TOTAL = 15; // questions in index.html (tests/test_quiz.py checks the number)

/** Collects everything that must stay empty: console errors, page errors, CSP violations. */
export async function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()} ${m.location().url || ''}`.trim());
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return problems;
}

/** Index (0-3) of the right answer button for the question on screen (read only, from the page's own state). */
export const correctIndex = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { shuffledQuestions: { c: number }[]; currentQ: number };
    return w.shuffledQuestions[w.currentQ].c;
  });
