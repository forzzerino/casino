import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSlot } from '../../state/store';
import { BonusGame } from '../bonus/BonusGame';
import { FreeSpinsBar } from '../bonus/FreeSpinsBar';
import { FreeSpinsOverlay } from '../bonus/FreeSpinsOverlay';
import { BigWinOverlay } from '../win/BigWinOverlay';
import { Mascot } from './Mascot';
import { MessageBar } from './MessageBar';
import { SlotBoard } from './SlotBoard';
import { SpinControls } from './SpinControls';
import { TopBar } from './TopBar';
import { useWinPresentation } from './useWinPresentation';

/** Top bar, the reels (with the mascot beside them) and the control deck; feature overlays above. */
export function GameScreen() {
  const reduced = useReducedMotion();
  const { step, stepIndex } = useWinPresentation(reduced);
  const bigWin = useSlot((s) => s.phase === 'showingBigWin');
  const freeSpins = useSlot((s) => s.freeSpins?.status === 'active');
  const feature = useSlot((s) => s.phase.startsWith('bonus') || s.phase === 'freeSpinsIntro' || s.phase === 'freeSpinsOutro');

  return (
    <div
      className={`cs-game${bigWin && !reduced ? ' is-shaking' : ''}${freeSpins ? ' is-free-spins' : ''}${bigWin || feature ? ' has-overlay' : ''}`}
    >
      <div className="cs-game__main" inert={feature || bigWin}>
        <TopBar />
        <main className="cs-stage">
          <Mascot />
          <div className="cs-stage__center">
            <FreeSpinsBar />
            <SlotBoard step={step} stepIndex={stepIndex} reducedMotion={reduced} />
            <MessageBar step={step} />
          </div>
        </main>
        <SpinControls />
      </div>
      <BigWinOverlay />
      <FreeSpinsOverlay />
      <BonusGame />
    </div>
  );
}
