import { useState } from 'react';
import { useAnimatedNumber } from '../../../../shared/hooks/useAnimatedNumber';
import { useGameEvent } from '../../hooks/useGameEvent';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { selectNeedsRefill } from '../../state/selectors';
import { formatSignedUSD, formatUSD } from '../../utils/format';
import { HudButton } from '../ui/HudButton';

export function PlayerStats() {
  const t = useT();
  const balance = useGameStore((s) => s.balance);
  const totalBet = useGameStore((s) => s.totalBet);
  const lastWin = useGameStore((s) => s.lastWin);
  const needsRefill = useGameStore(selectNeedsRefill);
  const refill = useGameStore((s) => s.refillBalance);
  const shownBalance = useAnimatedNumber(balance);
  const [flash, setFlash] = useState<{ id: number; amount: number } | null>(null);

  useGameEvent('payoutCredited', ({ amount }) => {
    if (amount > 0) setFlash({ id: performance.now(), amount });
  });

  return (
    <div className="player-stats">
      <div className="stat stat--balance">
        <span className="eyebrow">{t('hud.balance')}</span>
        <span className="stat__value stat__value--large">{formatUSD(shownBalance)}</span>
        {flash && (
          <span key={flash.id} className="payout-flash" onAnimationEnd={() => setFlash(null)}>
            {formatSignedUSD(flash.amount)}
          </span>
        )}
      </div>
      <div className="player-stats__row">
        <div className="stat">
          <span className="eyebrow">{t('hud.totalBet')}</span>
          <span className={`stat__value${totalBet > 0 ? ' is-active' : ''}`}>{formatUSD(totalBet)}</span>
        </div>
        <div className="stat">
          <span className="eyebrow">{t('hud.lastWin')}</span>
          <span className="stat__value stat__value--muted">{formatUSD(lastWin)}</span>
        </div>
      </div>
      {needsRefill && (
        <HudButton variant="ghost" className="refill-button" onClick={refill}>
          {t('actions.refill')}
        </HudButton>
      )}
    </div>
  );
}
