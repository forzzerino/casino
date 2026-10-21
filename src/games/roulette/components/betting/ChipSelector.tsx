import type { MouseEvent } from 'react';
import { chipPaletteForDenomination } from '../../config/chipPalettes';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { formatUSDWhole } from '../../utils/format';
import { ChipDisc } from './ChipDisc';

export function ChipSelector() {
  const t = useT();
  const selected = useGameStore((s) => s.selectedChip);
  const balance = useGameStore((s) => s.balance);
  const selectChip = useGameStore((s) => s.selectChip);
  const denominations = GAME_CONFIG.chipDenominations;

  const onSelect = (value: number) => (event: MouseEvent<HTMLButtonElement>) => {
    selectChip(value);
    if (event.detail > 0) event.currentTarget.blur();
  };

  return (
    <div className="chip-selector" role="radiogroup" aria-label={t('hud.chip')}>
      {denominations.map((value, index) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={selected === value}
          aria-label={formatUSDWhole(value)}
          title={`${formatUSDWhole(value)} · ${index + 1}`}
          className={`chip-button${selected === value ? ' is-selected' : ''}${value > balance ? ' is-unaffordable' : ''}`}
          onClick={onSelect(value)}
        >
          <ChipDisc value={value} palette={chipPaletteForDenomination(value, denominations)} />
        </button>
      ))}
    </div>
  );
}
