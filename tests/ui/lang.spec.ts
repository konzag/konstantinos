// The hub shell in two languages (EL + EN, owner 02/11): the 🏠 / 🔊 labels follow the shared key games.lang and
// the language button shows the other language. The game's own text stays Greek (GAME-STANDARD §9).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { URL, watch } from './helpers';

const PAGE = URL;

test('Greek shell by default; the language button offers English', async ({ page }) => {
  const problems = await watch(page);
  await page.goto(PAGE);
  await expect(page.locator('#hub-shell')).toHaveAttribute('lang', 'el');
  await expect(page.getByRole('link', { name: 'Πίσω στα παιχνίδια' })).toBeVisible();
  await expect(page.locator('#hub-shell button[aria-label="Ήχος"]')).toBeVisible();
  await expect(page.locator('#hub-shell button[aria-label="EN · English"]')).toHaveText('EN');
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test('switching to English changes the labels at once, persists and survives a reload', async ({ page }) => {
  const problems = await watch(page);
  await page.goto(PAGE);
  const html = await page.locator('html').getAttribute('lang');
  await page.locator('#hub-shell button[aria-label="EN · English"]').click();
  await expect(page.locator('#hub-shell')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Back to games' })).toHaveAttribute('href', '/');
  await expect(page.locator('#hub-shell button[aria-label="Sound"]')).toBeVisible();
  await expect(page.locator('#hub-shell button[aria-label="ΕΛ · Ελληνικά"]')).toHaveText('ΕΛ');
  expect(await page.evaluate(() => localStorage.getItem('games.lang'))).toBe('en');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Back to games' })).toBeVisible();
  expect(await page.locator('html').getAttribute('lang')).toBe(html); // the page itself is not changed
  await page.locator('#hub-shell button[aria-label="ΕΛ · Ελληνικά"]').click();
  await expect(page.getByRole('link', { name: 'Πίσω στα παιχνίδια' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('games.lang'))).toBe('el');
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test('an invalid stored language falls back to Greek', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('games.lang', 'xx'));
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: 'Πίσω στα παιχνίδια' })).toBeVisible();
  await expect(page.locator('#hub-shell button[aria-label="EN · English"]')).toBeVisible();
});

test('localStorage that throws: Greek shell and the switch still works', async ({ page }) => {
  await page.addInitScript(() => {
    const deny = () => { throw new Error('denied'); };
    Object.defineProperty(Storage.prototype, 'getItem', { value: deny });
    Object.defineProperty(Storage.prototype, 'setItem', { value: deny });
  });
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: 'Πίσω στα παιχνίδια' })).toBeVisible();
  await page.locator('#hub-shell button[aria-label="EN · English"]').click();
  await expect(page.getByRole('link', { name: 'Back to games' })).toBeVisible();
});

test('axe on the shell bar in English: serious/critical = 0', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('#hub-shell button[aria-label="EN · English"]').click();
  await expect(page.locator('#hub-shell')).toHaveAttribute('lang', 'en');
  const { violations } = await new AxeBuilder({ page }).include('#hub-shell').analyze();
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
  expect(bad).toEqual([]);
});
