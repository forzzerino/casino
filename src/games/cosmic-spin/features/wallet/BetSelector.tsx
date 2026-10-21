import { SLOT_CONFIG } from '../../game/config/gameRules';
import { Icon } from '../../components/Icon';
import { useCredits, useT } from '../../i18n';
import { selectCanChangeBet } from '../../state/selectors';
import { useDispatch, useSlot } from '../../state/store';

export function BetSelector({ onSound }: { onSound: () => void }) {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const bet = useSlot((s) => s.freeSpins?.bet ?? s.bet);
  const canChange = useSlot(selectCanChangeBet);
  const options = SLOT_CONFIG.betOptions;
  const index = options.indexOf(bet);

  const step = (direction: 1 | -1) => {
    onSound();
    dispatch({ type: 'stepBet', direction });
  };

  return (
    <div className="cs-bet" role="group" aria-label={t('hud.bet')}>
      <button
        type="button"
        className="cs-round-button cs-round-button--small"
        onClick={() => step(-1)}
        disabled={!canChange || index <= 0}
        aria-label={t('controls.betDown')}
      >
        <Icon name="minus" size={18} strokeWidth={3} />
      </button>
      <div className="cs-bet__value">
        <span className="cs-meter__label">{t('hud.bet')}</span>
        <output className="cs-bet__amount" aria-live="polite">
          {credits(bet)}
        </output>
      </div>
      <button
        type="button"
        className="cs-round-button cs-round-button--small"
        onClick={() => step(1)}
        disabled={!canChange || index >= options.length - 1}
        aria-label={t('controls.betUp')}
      >
        <Icon name="plus" size={18} strokeWidth={3} />
      </button>
    </div>
  );
}
