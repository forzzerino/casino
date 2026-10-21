import { describe, expect, it } from 'vitest';
import { GameClock } from '../clock';

describe('game clock', () => {
  it('stands still while paused and resumes without a jump', () => {
    let real = 1_000;
    const clock = new GameClock(() => real);
    expect(clock.now()).toBe(1_000);

    real = 1_500;
    clock.pause();
    real = 9_000;
    expect(clock.now()).toBe(1_500);
    expect(clock.paused).toBe(true);

    clock.resume();
    expect(clock.now()).toBe(1_500);
    real = 9_250;
    expect(clock.now()).toBe(1_750);
  });

  it('ignores repeated pause / resume calls', () => {
    let real = 0;
    const clock = new GameClock(() => real);
    clock.pause();
    real = 100;
    clock.pause();
    real = 300;
    clock.resume();
    clock.resume();
    real = 400;
    expect(clock.now()).toBe(100);
  });
});
