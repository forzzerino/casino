import { useEffect, useState } from 'react';
import { useCredits, useT } from '../i18n';
import { useSlot } from '../state/store';

/**
 * Screen-reader summary of each result, announced once per spin (never per
 * animation frame or count-up step).
 */
export function LiveAnnouncer() {
  const t = useT();
  const credits = useCredits();
  const spin = useSlot((s) => (s.spin?.revealed ? s.spin : null));
  const bonusCredits = useSlot((s) => (s.phase === 'bonusResult' ? (s.bonus?.payout?.credits ?? 0) : null));
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!spin) return;
    const { outcome, freeSpinsAdded } = spin;
    const parts = [outcome.totalWin > 0 ? t('a11y.win', { amount: credits(outcome.totalWin) }) : t('a11y.noWin')];
    if (freeSpinsAdded > 0) parts.push(t('msg.freeSpinsWon', { n: freeSpinsAdded }));
    if (outcome.bonus.triggered) parts.push(t('msg.bonus'));
    if (outcome.jackpot.triggered) parts.push(t('msg.jackpot'));
    setMessage(parts.join(' '));
    // Announce per spin only; language changes don't re-announce.
  }, [spin?.id]);

  useEffect(() => {
    if (bonusCredits !== null && bonusCredits > 0) setMessage(t('a11y.bonusWin', { amount: credits(bonusCredits) }));
  }, [bonusCredits]);

  return (
    <div className="cs-visually-hidden" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
