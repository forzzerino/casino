// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SymbolId } from '../game/config/symbols';
import CosmicSpinGame from '../CosmicSpinGame';
import { STORAGE_KEY } from '../state/persistence';

const PLAIN: SymbolId[][] = [
  ['moon', 'rocket', 'planet', 'robot', 'ufo'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];
const SCATTERS: SymbolId[][] = [
  ['scatter', 'rocket', 'scatter', 'robot', 'scatter'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];
const BONUS: SymbolId[][] = [
  ['bonus', 'rocket', 'bonus', 'robot', 'bonus'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];

const store = () => window.cosmicSpin!.store.getState();

beforeAll(() => {
  // jsdom has no canvas; the starfield and particles simply skip drawing.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('casino.language.v1', JSON.stringify({ language: 'tr' }));
  // Fast, reduced-motion presentation keeps the tests quick; outcomes are unaffected.
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, introSeen: true, settings: { master: 0, music: 0, effects: 0, musicOn: false, effectsOn: false, motion: 'reduced', speed: 'turbo' } }),
  );
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function enterGame() {
  const user = userEvent.setup();
  render(<CosmicSpinGame />);
  await user.click(await screen.findByRole('button', { name: 'Geç' }));
  await user.click(await screen.findByRole('button', { name: 'Oyna' }));
  await screen.findByRole('button', { name: 'Çevir' });
  return user;
}

const waitForPhase = (phase: string, timeout = 8_000) => waitFor(() => expect(store().phase).toBe(phase), { timeout });

describe('Cosmic Spin interactions', () => {
  it('goes from the main menu to the game', async () => {
    await enterGame();
    expect(screen.getByText('Bakiye')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Makaralar' })).toBeTruthy();
  });

  it('increases and decreases the bet', async () => {
    const user = await enterGame();
    const bet = within(screen.getByRole('group', { name: 'Bahis' })).getByRole('status');
    expect(bet.textContent).toBe('100');
    await user.click(screen.getByRole('button', { name: 'Bahsi artır' }));
    expect(bet.textContent).toBe('200');
    await user.click(screen.getByRole('button', { name: 'Bahsi azalt' }));
    await user.click(screen.getByRole('button', { name: 'Bahsi azalt' }));
    expect(bet.textContent).toBe('40');
  });

  it('spins once, however often the button is pressed', async () => {
    const user = await enterGame();
    act(() => window.cosmicSpin!.forceNext(PLAIN));
    const spin = screen.getByTestId('spin-button');
    await user.click(spin);
    expect(store().phase).toMatch(/spinning|reelStopping/);
    await user.click(spin);
    await user.click(spin);
    expect(store().stats.spins).toBe(1);
    await waitForPhase('idle');
    expect(store().balance).toBe(9_900);
  });

  it('spins with the space bar', async () => {
    const user = await enterGame();
    act(() => window.cosmicSpin!.forceNext(PLAIN));
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard(' ');
    expect(store().stats.spins).toBe(1);
    await waitForPhase('idle');
  });

  it('opens and closes the paytable', async () => {
    const user = await enterGame();
    await user.click(screen.getByRole('button', { name: 'Ödeme tablosu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ödeme Tablosu' });
    expect(within(dialog).getByText('Uzaylı')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ödeme Tablosu' })).toBeNull());
  });

  it('changes audio settings and keeps them', async () => {
    const user = await enterGame();
    await user.click(screen.getByRole('button', { name: 'Ayarlar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ayarlar' });
    fireEvent.change(within(dialog).getByRole('slider', { name: /Müzik/ }), { target: { value: '0.3' } });
    await user.click(within(dialog).getByRole('switch', { name: /Ses efektleri/ }));
    expect(store().settings.music).toBe(0.3);
    expect(store().settings.effectsOn).toBe(true);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').settings.music).toBe(0.3));
  });

  it('starts and stops autoplay', async () => {
    const user = await enterGame();
    act(() => window.cosmicSpin!.forceNext(...Array.from({ length: 30 }, () => PLAIN)));
    await user.click(screen.getByRole('button', { name: 'Otomatik' }));
    const dialog = await screen.findByRole('dialog', { name: 'Otomatik Oyun' });
    await user.click(within(dialog).getByRole('radio', { name: '25' }));
    await user.click(within(dialog).getByRole('button', { name: '25 çevirme başlat' }));
    await waitFor(() => expect(store().stats.spins).toBeGreaterThanOrEqual(2), { timeout: 8_000 });
    await user.click(screen.getByRole('button', { name: /^Durdur \(\d+ kaldı\)$/ }));
    expect(store().autoplay).toBeNull();
    const spins = store().stats.spins;
    await waitForPhase('idle');
    expect(store().stats.spins).toBeLessThanOrEqual(spins);
  });

  it('plays the bonus pick and pays exactly one capsule', async () => {
    const user = await enterGame();
    act(() => window.cosmicSpin!.forceNext(BONUS));
    await user.click(screen.getByTestId('spin-button'));
    await waitForPhase('bonusChoosing');
    const before = store().balance;
    const capsules = store().bonus!.capsules;
    await user.click(screen.getByRole('button', { name: 'Kapsül 2' }));
    await user.click(screen.getByRole('button', { name: 'Kapsül 4' }));
    expect(store().bonus?.pickedIndex).toBe(1);
    await waitForPhase('bonusResult');
    const reward = capsules[1];
    const credited = store().balance - before;
    expect(credited).toBe(store().bonus?.payout?.credits);
    expect(reward).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Devam' }));
    await waitFor(() => expect(store().bonus).toBeNull());
  });

  it('runs a full free-spins session', async () => {
    const user = await enterGame();
    act(() => window.cosmicSpin!.forceNext(SCATTERS, ...Array.from({ length: 8 }, () => PLAIN)));
    await user.click(screen.getByTestId('spin-button'));
    await user.click(await screen.findByRole('button', { name: 'Başlat' }, { timeout: 8_000 }));
    await waitForPhase('freeSpinsOutro', 25_000);
    expect(store().freeSpins).toMatchObject({ played: 8, remaining: 0 });
    expect(store().stats.spins).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Devam' }));
    await waitForPhase('idle');
  }, 40_000);

  it('offers a credit reset when the balance runs out', async () => {
    const user = await enterGame();
    act(() => window.cosmicSpin!.store.setState({ balance: 0, phase: 'insufficientBalance' }));
    await user.click(await screen.findByRole('button', { name: 'Kredileri sıfırla' }));
    expect(store().balance).toBe(10_000);
    expect(store().phase).toBe('idle');
  });
});
