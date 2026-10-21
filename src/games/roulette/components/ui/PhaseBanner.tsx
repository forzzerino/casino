import { GAME_CONFIG } from '../../config/gameConfig';
import { usePhaseProgress } from '../../hooks/usePhaseProgress';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { GamePhase } from '../../types/game';

function TimerRing({ progress, seconds, warning }: { progress: number; seconds: number; warning: boolean }) {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`timer-ring${warning ? ' is-warning' : ''}`}>
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        <circle className="timer-ring__track" cx="22" cy="22" r={radius} />
        <circle
          className="timer-ring__value"
          cx="22"
          cy="22"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * progress}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="timer-ring__seconds">{seconds}</span>
    </div>
  );
}

/** Always tells the player which phase the round is in, with the countdown while betting. */
export function PhaseBanner() {
  const t = useT();
  const phase = useGameStore((s) => s.gamePhase);
  const timer = useGameStore((s) => s.timer);
  const round = useGameStore((s) => s.roundId);
  const result = useGameStore((s) => s.resultNumber);
  const betting = phase === GamePhase.BETTING;
  const progress = usePhaseProgress(betting);
  const warning = betting && timer <= GAME_CONFIG.timings.timerWarningSeconds;

  let label = t(`phase.${phase}`);
  if (phase === GamePhase.IDLE && round === 0) label = t('phase.welcome');
  if (phase === GamePhase.RESULT && result !== null) label = `${t('phase.RESULT')} · ${result}`;

  return (
    <div
      className={`phase-banner phase-banner--${phase.toLowerCase()}${warning ? ' is-warning' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="phase-banner__dot" aria-hidden="true" />
      <div className="phase-banner__text">
        <span className="phase-banner__round">{round > 0 ? t('roulette.round', { round }) : t('app.table')}</span>
        <span className="phase-banner__label">{label}</span>
      </div>
      {betting && <TimerRing progress={progress} seconds={timer} warning={warning} />}
    </div>
  );
}
