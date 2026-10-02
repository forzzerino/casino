import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { selectCanClear, selectCanDouble, selectCanRepeat, selectCanUndo } from '../../state/selectors';
import { HudButton } from '../ui/HudButton';
import { Icon } from '../ui/Icon';

export function BetActions() {
  const t = useT();
  const canUndo = useGameStore(selectCanUndo);
  const canClear = useGameStore(selectCanClear);
  const canRepeat = useGameStore(selectCanRepeat);
  const canDouble = useGameStore(selectCanDouble);
  const { undo, clearBets, repeatBets, doubleBets } = useGameStore.getState();

  return (
    <div className="bet-actions">
      <HudButton className="action-button" disabled={!canUndo} onClick={undo} title="Ctrl+Z">
        <Icon name="undo" />
        <span>{t('actions.undo')}</span>
      </HudButton>
      <HudButton className="action-button" disabled={!canClear} onClick={clearBets}>
        <Icon name="clear" />
        <span>{t('actions.clear')}</span>
      </HudButton>
      <HudButton className="action-button" disabled={!canRepeat} onClick={repeatBets} title="R">
        <Icon name="repeat" />
        <span>{t('actions.repeat')}</span>
      </HudButton>
      <HudButton className="action-button" disabled={!canDouble} onClick={doubleBets} title="D">
        <Icon name="double" />
        <span>{t('actions.double')}</span>
      </HudButton>
    </div>
  );
}
