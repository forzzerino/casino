import { useCallback, useEffect, useRef } from 'react';
import { EFFECTS, criticalImages, symbolBlurImage, symbolImage } from '../../assets/manifest';
import { ALL_SYMBOLS } from '../../game/config/symbols';
import { Logo } from '../../components/Logo';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useT } from '../../i18n';
import { useRuntime } from '../../runtime';
import { useDispatch } from '../../state/store';

/** Warms the browser cache while the intro plays, so the first spin never waits on artwork. */
function preload(urls: readonly string[]): void {
  for (const url of urls) {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
  }
}

/**
 * Short opening: space fades in, the logo scales up under a light sweep, a UFO
 * crosses. Click, tap or any key skips it; returning players get a shorter one.
 */
export function IntroScene() {
  const t = useT();
  const dispatch = useDispatch();
  const runtime = useRuntime();
  const reduced = useReducedMotion();
  const finished = useRef(false);
  const duration = reduced ? 900 : runtime.hasSeenIntro ? 1_500 : 3_300;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    runtime.markIntroSeen();
    dispatch({ type: 'introFinished' });
  }, [dispatch, runtime]);

  useEffect(() => {
    preload([...criticalImages(ALL_SYMBOLS), ...ALL_SYMBOLS.map(symbolBlurImage), ...Object.values(EFFECTS).map((e) => e.image)]);
    const timer = setTimeout(finish, duration);
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      runtime.unlockAudio();
      finish();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [duration, finish, runtime]);

  return (
    <div
      className={`cs-intro${runtime.hasSeenIntro ? ' is-short' : ''}`}
      onClick={() => {
        runtime.unlockAudio();
        finish();
      }}
    >
      <div className="cs-intro__stage">
        <Logo size="large" animated />
        {!reduced && <img className="cs-intro__ufo" src={symbolImage('ufo')} alt="" aria-hidden="true" />}
        <p className="cs-intro__tagline">{t('app.tagline')}</p>
      </div>
      <button type="button" className="cs-intro__skip" onClick={finish}>
        {t('intro.skip')}
      </button>
    </div>
  );
}
