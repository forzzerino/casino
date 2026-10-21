import { useEffect, useRef, useState } from 'react';
import { useAnimatedNumber } from '../../../../shared/hooks/useAnimatedNumber';
import { useCredits, useT } from '../../i18n';
import { selectJackpot } from '../../state/selectors';
import { useDispatch, useSlot } from '../../state/store';

/** Gold jackpot plaque; ticks up as bets feed the pool and opens the jackpot rules on click. */
export function JackpotMeter({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const pool = useSlot(selectJackpot);
  const shown = useAnimatedNumber(pool, 900);
  const previous = useRef(pool);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (pool > previous.current) setBump((n) => n + 1);
    previous.current = pool;
  }, [pool]);

  return (
    <button
      type="button"
      className={`cs-jackpot${compact ? ' is-compact' : ''}`}
      onClick={() => dispatch({ type: 'openModal', modal: 'paytable' })}
      aria-label={`${t('hud.jackpot')}: ${credits(pool)}`}
    >
      <span className="cs-jackpot__tab">{t('hud.jackpot')}</span>
      <span key={bump} className="cs-jackpot__value">
        {credits(shown)}
      </span>
    </button>
  );
}
