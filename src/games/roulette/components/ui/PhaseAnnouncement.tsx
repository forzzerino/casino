import { useState } from 'react';
import { useGameEvent } from '../../hooks/useGameEvent';
import { useT } from '../../hooks/useT';
import type { TranslationKey } from '../../i18n';
import { GamePhase } from '../../types/game';

const ANNOUNCED: Partial<Record<GamePhase, TranslationKey>> = {
  [GamePhase.BETTING]: 'roulette.placeYourBets',
  [GamePhase.NO_MORE_BETS]: 'roulette.noMoreBets',
};

/** Broadcast-style call-outs for the two moments that matter most. */
export function PhaseAnnouncement() {
  const t = useT();
  const [current, setCurrent] = useState<{ id: number; key: TranslationKey; phase: GamePhase } | null>(null);

  useGameEvent('phaseChanged', ({ phase }) => {
    const key = ANNOUNCED[phase];
    if (key) setCurrent({ id: performance.now(), key, phase });
  });

  if (!current) return null;
  return (
    <div
      key={current.id}
      className={`announcement announcement--${current.phase.toLowerCase()}`}
      onAnimationEnd={() => setCurrent(null)}
      aria-hidden="true"
    >
      <span className="announcement__rule" />
      <span className="announcement__text">{t(current.key)}</span>
      <span className="announcement__rule" />
    </div>
  );
}
