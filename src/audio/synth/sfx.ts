import { bell, clack, swish, thump, type Voice } from './primitives';

export type SfxName =
  | 'uiClick'
  | 'toggle'
  | 'chipSelect'
  | 'chipPlace'
  | 'chipsReturn'
  | 'error'
  | 'placeYourBets'
  | 'noMoreBets'
  | 'timerTick'
  | 'ballLaunch'
  | 'ballClack'
  | 'ballSettle'
  | 'ballRattle'
  | 'win'
  | 'lose'
  | 'payout';

export interface SfxOptions {
  /** 0..1 */
  readonly intensity?: number;
  readonly pan?: number;
}

type SfxRenderer = (v: Voice, time: number, intensity: number, pan: number) => void;

const jitter = (amount: number): number => 1 + (Math.random() * 2 - 1) * amount;

/** Clay-composite chip on felt: a dull clack with a short body. */
function chipClack(v: Voice, time: number, gain: number, pan: number): void {
  clack(v, time, { frequency: 2600 * jitter(0.12), q: 3.2, decay: 0.035, gain, ring: 0.22, pan });
  clack(v, time + 0.002, { frequency: 950 * jitter(0.1), q: 2, decay: 0.03, gain: gain * 0.5, ring: 0, pan });
}

/** Phenolic ball against a metal fret: brighter, harder, slightly metallic. */
function ballHit(v: Voice, time: number, gain: number, pan: number): void {
  clack(v, time, { frequency: 4300 * jitter(0.15), q: 7, decay: 0.022, gain, ring: 0.45, pan });
  clack(v, time, { frequency: 1500 * jitter(0.1), q: 3, decay: 0.03, gain: gain * 0.4, ring: 0, pan });
}

const RENDERERS: Readonly<Record<SfxName, SfxRenderer>> = {
  uiClick: (v, t, i) => {
    clack(v, t, { frequency: 2100, q: 1.6, decay: 0.014, gain: 0.12 * i, ring: 0.5 });
  },
  toggle: (v, t, i) => {
    clack(v, t, { frequency: 1500, q: 2, decay: 0.018, gain: 0.12 * i, ring: 0.6 });
    clack(v, t + 0.045, { frequency: 2300, q: 2, decay: 0.014, gain: 0.08 * i, ring: 0.5 });
  },
  chipSelect: (v, t, i) => {
    chipClack(v, t, 0.22 * i, 0);
    chipClack(v, t + 0.03, 0.12 * i, 0);
  },
  chipPlace: (v, t, i, pan) => {
    chipClack(v, t, 0.42 * i, pan);
    chipClack(v, t + 0.028 + Math.random() * 0.012, 0.2 * i, pan);
  },
  chipsReturn: (v, t, i) => {
    swish(v, t, { from: 1800, to: 900, duration: 0.25, gain: 0.05 * i, q: 0.9 });
    for (let k = 0; k < 3; k++) chipClack(v, t + 0.12 + k * 0.045, (0.25 - k * 0.06) * i, 0);
  },
  error: (v, t, i) => {
    thump(v, t, 196, 0.2 * i);
    thump(v, t + 0.11, 165, 0.16 * i);
  },
  placeYourBets: (v, t, i) => {
    bell(v, t, 587.33, { gain: 0.07 * i, duration: 1.2, ratio: 2, index: 0.8 });
    bell(v, t + 0.16, 783.99, { gain: 0.07 * i, duration: 1.6, ratio: 2, index: 0.8 });
  },
  noMoreBets: (v, t, i) => {
    bell(v, t, 783.99, { gain: 0.07 * i, duration: 1.2, ratio: 2, index: 0.8 });
    bell(v, t + 0.18, 523.25, { gain: 0.07 * i, duration: 1.8, ratio: 2, index: 0.8 });
  },
  timerTick: (v, t, i) => {
    clack(v, t, { frequency: 1750, q: 5, decay: 0.03, gain: 0.07 * i, ring: 0.8 });
  },
  ballLaunch: (v, t, i) => {
    swish(v, t, { from: 500, to: 2600, duration: 0.4, gain: 0.08 * i, q: 1.1 });
    ballHit(v, t + 0.05, 0.12 * i, 0);
  },
  ballClack: (v, t, i, pan) => ballHit(v, t, 0.34 * i, pan),
  ballSettle: (v, t, i, pan) => {
    ballHit(v, t, 0.36 * i, pan);
    ballHit(v, t + 0.07, 0.14 * i, pan);
  },
  ballRattle: (v, t, i, pan) => ballHit(v, t, 0.22 * i, pan),
  win: (v, t, i) => {
    const notes = [1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((f, k) => bell(v, t + k * 0.085, f, { gain: 0.05 * i, duration: 1.8, ratio: 3.5, index: 1.1 }));
  },
  lose: (v, t, i) => {
    bell(v, t, 392, { gain: 0.035 * i, duration: 1.1, ratio: 1, index: 0.4 });
    bell(v, t + 0.2, 329.63, { gain: 0.03 * i, duration: 1.4, ratio: 1, index: 0.4 });
  },
  payout: (v, t, i) => {
    const count = 7;
    for (let k = 0; k < count; k++) {
      const at = t + k * 0.06 + Math.random() * 0.025;
      chipClack(v, at, (0.34 - k * 0.035) * i, (Math.random() - 0.5) * 0.4);
    }
  },
};

export function renderSfx(v: Voice, name: SfxName, time: number, options: SfxOptions = {}): void {
  RENDERERS[name](v, time, options.intensity ?? 1, options.pan ?? 0);
}
