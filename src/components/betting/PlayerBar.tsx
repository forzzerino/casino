import { BetActions } from './BetActions';
import { BetButton } from './BetButton';
import { ChipSelector } from './ChipSelector';
import { PlayerStats } from './PlayerStats';
import { SelectionInfo } from './SelectionInfo';

/** Bottom player area: money, chip, BET, and bet management. */
export function PlayerBar() {
  return (
    <section className="player-bar panel">
      <SelectionInfo />
      <PlayerStats />
      <div className="player-bar__center">
        <ChipSelector />
        <BetButton />
      </div>
      <BetActions />
    </section>
  );
}
