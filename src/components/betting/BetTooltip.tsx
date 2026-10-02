import { useState } from 'react';
import { useGameEvent } from '../../hooks/useGameEvent';
import { describeSpot } from '../../i18n/describeSpot';
import { useGameStore } from '../../state/gameStore';
import type { BetSpot } from '../../types/game';
import { formatUSD } from '../../utils/format';

/** Follows the pointer over the felt: which bet this spot is and what it pays. */
export function BetTooltip() {
  const language = useGameStore((s) => s.language);
  const bets = useGameStore((s) => s.currentBets);
  const [hover, setHover] = useState<{ spot: BetSpot; x: number; y: number } | null>(null);

  useGameEvent('layoutHover', ({ spot, x, y }) => setHover(spot ? { spot, x, y } : null));

  if (!hover) return null;
  const d = describeSpot(hover.spot, language);
  const amount = bets[hover.spot.key]?.amount ?? 0;
  return (
    <div className="bet-tooltip" style={{ transform: `translate(${hover.x + 18}px, ${hover.y + 18}px)` }}>
      <span className="bet-tooltip__name">{d.name}</span>
      {d.detail && <span className="bet-tooltip__detail">{d.detail}</span>}
      <span className="bet-tooltip__pays">{d.payout}</span>
      {amount > 0 && <span className="bet-tooltip__amount">{formatUSD(amount)}</span>}
    </div>
  );
}
