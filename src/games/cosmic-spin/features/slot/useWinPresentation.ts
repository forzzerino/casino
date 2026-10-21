import { useEffect, useMemo, useState } from 'react';
import { REDUCED_MOTION_PROFILE, SPEED_PROFILES } from '../../game/config/presentation';
import type { Phase } from '../../state/gameTypes';
import { useSlot } from '../../state/store';
import { buildWinSteps, type WinStep } from './winSteps';

/** Phases in which the last spin's wins are on display (they keep cycling while the game rests). */
const SHOWING: readonly Phase[] = ['showingWins', 'showingBigWin', 'idle', 'insufficientBalance', 'freeSpins', 'bonusIntro', 'freeSpinsIntro'];

/** The win step currently highlighted on the reels, cycling at the speed profile's pace. */
export function useWinPresentation(reducedMotion: boolean): { step: WinStep | null; stepIndex: number; steps: readonly WinStep[] } {
  const spin = useSlot((s) => s.spin);
  const phase = useSlot((s) => s.phase);
  const speed = useSlot((s) => s.settings.speed);
  const steps = useMemo(() => (spin?.revealed ? buildWinSteps(spin) : []), [spin]);
  const active = steps.length > 0 && SHOWING.includes(phase);
  const cycleMs = (reducedMotion ? REDUCED_MOTION_PROFILE : SPEED_PROFILES[speed]).lineCycleMs;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (!active || steps.length < 2) return;
    // Slower once the presentation is over and the game is just resting.
    const interval = setInterval(() => setIndex((i) => (i + 1) % steps.length), phase === 'showingWins' ? cycleMs : Math.max(cycleMs, 1_400));
    return () => clearInterval(interval);
  }, [active, steps, cycleMs, phase]);

  const step = active ? (steps[index % steps.length] ?? null) : null;
  return { step, stepIndex: index, steps };
}
