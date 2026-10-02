import { bassNote, bell, electricPiano, midiToFrequency, swish, type Voice } from './primitives';

interface Chord {
  /** Walking bass line for the bar (MIDI, one per beat). */
  readonly bass: readonly [number, number, number, number];
  /** Rootless electric-piano voicing (MIDI). */
  readonly voicing: readonly number[];
  /** Notes the vibraphone may improvise with (MIDI). */
  readonly melody: readonly number[];
}

/** Slow lounge progression in C: Dm9 – G13 – Cmaj9 – Am9 – Fmaj7 – Em7 – Dm9 – G7sus. */
const PROGRESSION: readonly Chord[] = [
  { bass: [38, 45, 41, 42], voicing: [53, 57, 60, 64], melody: [74, 77, 81, 76] },
  { bass: [43, 47, 50, 44], voicing: [53, 59, 64, 69], melody: [74, 71, 76, 79] },
  { bass: [36, 43, 40, 44], voicing: [52, 55, 59, 62], melody: [76, 79, 83, 74] },
  { bass: [45, 40, 43, 40], voicing: [55, 59, 60, 64], melody: [72, 76, 79, 71] },
  { bass: [41, 45, 48, 41], voicing: [53, 57, 60, 64], melody: [77, 81, 76, 72] },
  { bass: [40, 47, 43, 39], voicing: [50, 55, 59, 62], melody: [74, 79, 76, 71] },
  { bass: [38, 45, 41, 44], voicing: [53, 57, 60, 64], melody: [74, 77, 72, 81] },
  { bass: [43, 50, 48, 37], voicing: [53, 55, 60, 65], melody: [77, 74, 72, 79] },
];

const TEMPO = 68;
const BEAT = 60 / TEMPO;
const BAR = BEAT * 4;
const SWING = 0.62;
const LOOKAHEAD_SECONDS = 0.9;

/** Comping rhythms in beats (position, velocity). */
const COMP_PATTERNS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, 0.85],
    [1.5, 0.6],
  ],
  [
    [0, 0.8],
    [2.5, 0.55],
  ],
  [
    [0.5, 0.7],
    [2, 0.6],
  ],
  [[0, 0.9]],
];

/** A gentle, endlessly varying jazz-lounge backing track. */
export class LoungeMusic {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private barIndex = 0;

  constructor(private readonly v: Voice) {}

  start(): void {
    if (this.timer !== null) return;
    this.nextBarTime = this.v.ctx.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const horizon = this.v.ctx.currentTime + LOOKAHEAD_SECONDS;
    // After a long suspension, resync rather than flood the scheduler.
    if (this.nextBarTime < this.v.ctx.currentTime - BAR) this.nextBarTime = this.v.ctx.currentTime + 0.1;
    while (this.nextBarTime < horizon) {
      this.scheduleBar(this.nextBarTime, PROGRESSION[this.barIndex % PROGRESSION.length]);
      this.nextBarTime += BAR;
      this.barIndex++;
    }
  }

  private swung(beatPosition: number): number {
    const whole = Math.floor(beatPosition);
    const fraction = beatPosition - whole;
    return (whole + (fraction === 0.5 ? SWING : fraction)) * BEAT;
  }

  private scheduleBar(time: number, chord: Chord): void {
    const pattern = COMP_PATTERNS[Math.floor(Math.random() * COMP_PATTERNS.length)];
    for (const [position, velocity] of pattern) {
      const at = time + this.swung(position) + Math.random() * 0.012;
      chord.voicing.forEach((note, k) => {
        electricPiano(this.v, at + k * 0.008, note, velocity * (0.85 + Math.random() * 0.2), BAR * 0.7);
      });
    }

    chord.bass.forEach((note, beat) => bassNote(this.v, time + beat * BEAT, note, beat === 0 ? 1 : 0.8));

    // Brushes on 2 and 4 with a ghosted swung eighth.
    for (const beat of [1, 3]) {
      swish(this.v, time + beat * BEAT, { from: 7000, to: 4200, duration: 0.16, gain: 0.018, q: 0.7 });
      swish(this.v, time + this.swung(beat + 0.5), { from: 6000, to: 5000, duration: 0.08, gain: 0.008, q: 0.7 });
    }

    // Sparse vibraphone phrases every other bar.
    if (this.barIndex % 2 === 1 && Math.random() < 0.75) {
      const notes = 2 + Math.floor(Math.random() * 3);
      let position = Math.floor(Math.random() * 2) * 0.5;
      for (let k = 0; k < notes && position < 4; k++) {
        const midi = chord.melody[Math.floor(Math.random() * chord.melody.length)];
        bell(this.v, time + this.swung(position), midiToFrequency(midi), {
          gain: 0.028,
          duration: 1.6,
          ratio: 4,
          index: 0.35,
        });
        position += [0.5, 1, 1.5][Math.floor(Math.random() * 3)];
      }
    }
  }
}
