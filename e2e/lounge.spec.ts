import { expect, test, type Page } from '@playwright/test';

type SymbolRows = string[][];

const BONUS: SymbolRows = [
  ['bonus', 'rocket', 'bonus', 'robot', 'bonus'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];

/** Fails the test on any console error or uncaught exception. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function prepare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-prepared')) return;
    sessionStorage.setItem('e2e-prepared', '1');
    localStorage.clear();
    localStorage.setItem('casino.language.v1', JSON.stringify({ language: 'en' }));
    localStorage.setItem(
      'cosmic-spin.session',
      JSON.stringify({ version: 1, introSeen: true, settings: { master: 0.8, music: 0.4, effects: 0.8, musicOn: true, effectsOn: true, motion: 'system', speed: 'turbo' } }),
    );
  });
}

const phase = (page: Page) => page.evaluate(() => window.cosmicSpin?.store.getState().phase);

async function enterCosmicSpin(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: /Cosmic Spin/ }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByTestId('spin-button')).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('the lobby lists both games', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Game Lounge' })).toBeVisible();
  await expect(page.getByRole('link', { name: /European Roulette/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Cosmic Spin/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Cosmic Spin: enter, spin and see the result', async ({ page }) => {
  const errors = watchErrors(page);
  await enterCosmicSpin(page);
  const balance = page.locator('.cs-meter--balance .cs-meter__value');
  await expect(balance).toHaveText('10,000');

  await page.getByTestId('spin-button').click();
  await expect.poll(() => phase(page)).toMatch(/idle|insufficientBalance|showingWins|showingBigWin|freeSpinsIntro|bonusIntro/);
  const state = await page.evaluate(() => {
    const s = window.cosmicSpin!.store.getState();
    return { spins: s.stats.spins, wagered: s.stats.wagered, won: s.stats.won, balance: s.balance };
  });
  expect(state.spins).toBe(1);
  expect(state.balance).toBe(10_000 - state.wagered + state.won);
  await expect(page.locator('.cs-message')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test('Cosmic Spin: the paytable opens and closes', async ({ page }) => {
  await enterCosmicSpin(page);
  await page.getByRole('button', { name: 'Paytable' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Paytable' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Purple Planet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Cosmic Spin: a deterministic bonus round pays its capsule once', async ({ page }) => {
  const errors = watchErrors(page);
  await enterCosmicSpin(page);
  await page.evaluate((rows) => window.cosmicSpin!.forceNext(rows as never), BONUS);
  await page.getByTestId('spin-button').click();
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('bonusChoosing');
  const before = await page.evaluate(() => window.cosmicSpin!.store.getState().balance);
  await page.getByRole('button', { name: 'Capsule 3' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 10_000 });
  const after = await page.evaluate(() => {
    const s = window.cosmicSpin!.store.getState();
    return { balance: s.balance, credits: s.bonus?.payout?.credits ?? 0, picked: s.bonus?.pickedIndex };
  });
  expect(after.picked).toBe(2);
  expect(after.balance - before).toBe(after.credits);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect.poll(() => phase(page), { timeout: 10_000 }).toMatch(/idle|freeSpinsIntro/);
  expect(errors).toEqual([]);
});

test('Cosmic Spin: the balance survives a reload', async ({ page }) => {
  await enterCosmicSpin(page);
  await page.getByTestId('spin-button').click();
  await expect.poll(() => phase(page)).toMatch(/idle|insufficientBalance|showingWins|showingBigWin|freeSpinsIntro|bonusIntro/);
  const balance = await page.evaluate(() => window.cosmicSpin!.store.getState().balance);
  await page.waitForTimeout(400);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.cosmicSpin?.store.getState().balance)).toBe(balance);
});

test('the layout fits the viewport without horizontal scrolling', async ({ page }) => {
  await enterCosmicSpin(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const viewport = page.viewportSize()!;
  for (const reel of await page.locator('.cs-reel').all()) {
    const box = await reel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  }
  await expect(page.getByTestId('spin-button')).toBeInViewport();
});

test('Roulette still loads and returns to the lobby', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByRole('link', { name: /European Roulette/ }).click();
  await page.getByRole('button', { name: 'Take a Seat' }).click();
  await page.getByRole('button', { name: 'Back to Lobby' }).first().click();
  await expect(page.getByRole('heading', { name: 'Game Lounge' })).toBeVisible();
  // WebGL shader compiler notes are warnings, not errors; anything else fails the test.
  expect(errors).toEqual([]);
});
