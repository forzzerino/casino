import { SPIN_SPEEDS } from '../../game/config/presentation';
import { Icon } from '../../components/Icon';
import { useCredits, useT } from '../../i18n';
import { useRuntime } from '../../runtime';
import { selectCanSpin, selectShownWin } from '../../state/selectors';
import { useDispatch, useSlot } from '../../state/store';
import { BetSelector } from '../wallet/BetSelector';

function SpinButton() {
  const t = useT();
  const { controller, audio } = useRuntime();
  const phase = useSlot((s) => s.phase);
  const canSpin = useSlot(selectCanSpin);
  const autoplay = useSlot((s) => s.autoplay);
  const freeSpins = useSlot((s) => (s.freeSpins?.status === 'active' ? s.freeSpins : null));
  const modalOpen = useSlot((s) => s.modal !== null);

  const spinning = phase === 'spinning' || phase === 'reelStopping';
  const presenting = phase === 'showingWins' || phase === 'showingBigWin';
  const autoplaying = autoplay !== null && (phase === 'idle' || spinning || presenting || phase === 'evaluating');

  let label = t('controls.spin');
  let mode: 'spin' | 'stop' | 'skip' | 'auto' | 'free' = 'spin';
  if (freeSpins) mode = 'free';
  else if (autoplaying) mode = 'auto';
  else if (spinning) mode = 'stop';
  else if (presenting) mode = 'skip';
  if (mode === 'stop') label = t('controls.stopReels');
  if (mode === 'skip') label = t('controls.skip');
  if (mode === 'auto') label = t('controls.stopAutoplay');

  const enabled = !modalOpen && (canSpin || spinning || presenting || mode === 'auto');

  return (
    <button
      type="button"
      className={`cs-spin is-${mode}${spinning ? ' is-spinning' : ''}`}
      onClick={() => {
        audio.play('click');
        controller.pressSpin();
      }}
      disabled={!enabled || mode === 'free'}
      aria-label={label}
      data-testid="spin-button"
    >
      <span className="cs-spin__ring" aria-hidden="true" />
      <span className="cs-spin__icon">
        <Icon name={mode === 'auto' ? 'stop' : 'spin'} size={mode === 'auto' ? 26 : 38} />
      </span>
      <span className="cs-spin__label">
        {mode === 'free' && freeSpins
          ? `${freeSpins.played}/${freeSpins.awarded}`
          : mode === 'auto' && autoplay
            ? autoplay.remaining
            : mode === 'stop'
              ? ''
              : label}
      </span>
    </button>
  );
}

function SpeedToggle() {
  const t = useT();
  const dispatch = useDispatch();
  const { audio } = useRuntime();
  const speed = useSlot((s) => s.settings.speed);
  const next = SPIN_SPEEDS[(SPIN_SPEEDS.indexOf(speed) + 1) % SPIN_SPEEDS.length];
  return (
    <button
      type="button"
      className={`cs-tool is-speed-${speed}`}
      onClick={() => {
        audio.play('toggle');
        dispatch({ type: 'updateSettings', patch: { speed: next } });
      }}
      aria-label={`${t('controls.speed')}: ${t(`speed.${speed}`)}`}
    >
      <span className="cs-tool__icon">
        <Icon name="bolt" size={20} />
        {speed !== 'normal' && <Icon name="bolt" size={20} className="cs-tool__icon-echo" />}
      </span>
      <span className="cs-tool__label">{t(`speed.${speed}`)}</span>
    </button>
  );
}

function AutoplayButton() {
  const t = useT();
  const dispatch = useDispatch();
  const { audio } = useRuntime();
  const autoplay = useSlot((s) => s.autoplay);
  const available = useSlot((s) => s.phase === 'idle' && s.freeSpins === null && s.bonus === null && s.balance >= s.bet);
  return (
    <button
      type="button"
      className={`cs-tool${autoplay ? ' is-active' : ''}`}
      onClick={() => {
        audio.play('toggle');
        if (autoplay) dispatch({ type: 'autoplayStop', reason: 'player' });
        else dispatch({ type: 'openModal', modal: 'autoplay' });
      }}
      disabled={!autoplay && !available}
      aria-label={autoplay ? `${t('controls.stopAutoplay')} (${t('controls.autoplayLeft', { n: autoplay.remaining })})` : t('controls.autoplay')}
    >
      <span className="cs-tool__icon">
        <Icon name={autoplay ? 'stop' : 'autoplay'} size={20} />
      </span>
      <span className="cs-tool__label">{autoplay ? t('controls.autoplayLeft', { n: autoplay.remaining }) : t('controls.autoplay')}</span>
    </button>
  );
}

function WinDisplay() {
  const t = useT();
  const credits = useCredits();
  const win = useSlot(selectShownWin);
  const freeSpinsTotal = useSlot((s) => (s.freeSpins?.status === 'active' ? s.freeSpins.totalWin : null));
  const value = freeSpinsTotal ?? win;
  return (
    <div className={`cs-meter cs-meter--win${value > 0 ? ' has-win' : ''}`}>
      <span className="cs-meter__label">{freeSpinsTotal !== null ? `${t('fs.title')} · ${t('fs.total')}` : t('hud.lastWin')}</span>
      <span className="cs-meter__value">{credits(value)}</span>
    </div>
  );
}

/** Bottom control deck: bet, last win, the SPIN button, speed, autoplay and paytable. */
export function SpinControls() {
  const t = useT();
  const dispatch = useDispatch();
  const { audio } = useRuntime();
  return (
    <div className="cs-controls">
      <div className="cs-controls__side cs-controls__side--left">
        <BetSelector onSound={() => audio.play('click')} />
        <WinDisplay />
      </div>
      <SpinButton />
      <div className="cs-controls__side cs-controls__side--right">
        <SpeedToggle />
        <AutoplayButton />
        <button
          type="button"
          className="cs-tool"
          onClick={() => {
            audio.play('toggle');
            dispatch({ type: 'openModal', modal: 'paytable' });
          }}
          aria-label={t('hud.paytable')}
        >
          <span className="cs-tool__icon">
            <Icon name="info" size={20} />
          </span>
          <span className="cs-tool__label">{t('controls.paytable')}</span>
        </button>
      </div>
    </div>
  );
}
