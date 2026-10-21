/**
 * Generative space-lounge loop: warm pads, a bell arpeggio, a soft bass and a
 * quiet shaker, scheduled a little ahead of time. Each mode has its own chord
 * progression so free spins and the bonus feel different without new assets.
 */
import { bell, midiToFrequency, type Voice } from '../../../shared/audio/primitives';

export type MusicMode = 'base' | 'free' | 'bonus';

interface Progression {
  readonly bpm: number;
  /** Chords as MIDI notes; each lasts two bars. */
  readonly chords: readonly (readonly number[])[];
  readonly arpRate: 2 | 4;
}

const PROGRESSIONS: Readonly<Record<MusicMode, Progression>> = {
  base: {
    bpm: 92,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [48, 52, 55, 59],
      [55, 59, 62, 64],
    ],
    arpRate: 2,
  },
  free: {
    bpm: 108,
    chords: [
      [52, 56, 59, 63],
      [57, 61, 64, 68],
      [49, 52, 56, 59],
      [54, 57, 61, 64],
    ],
    arpRate: 4,
  },
  bonus: {
    bpm: 84,
    chords: [
      [50, 55, 57, 62],
      [48, 53, 55, 60],
    ],
    arpRate: 2,
  },
};

const LOOKAHEAD_S = 0.35;
const TICK_MS = 120;

export class CosmicMusic {
  private timer: ReturnType<typeof setInterval> | null = null;
  private mode: MusicMode = 'base';
  private nextBeatTime = 0;
  private beat = 0;
  private readonly bus: GainNode;

  constructor(private readonly voice: Voice) {
    this.bus = voice.ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(voice.out);
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    const { ctx } = this.voice;
    this.nextBeatTime = ctx.currentTime + 0.1;
    this.beat = 0;
    this.bus.gain.cancelScheduledValues(ctx.currentTime);
    this.bus.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
    const { ctx } = this.voice;
    this.bus.gain.cancelScheduledValues(ctx.currentTime);
    this.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  }

  setMode(mode: MusicMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    // Restart the bar count so the new progression begins on its first chord.
    this.beat = 0;
  }

  private schedule(): void {
    const { ctx } = this.voice;
    const progression = PROGRESSIONS[this.mode];
    const beatLength = 60 / progression.bpm;
    while (this.nextBeatTime < ctx.currentTime + LOOKAHEAD_S) {
      this.playBeat(this.nextBeatTime, this.beat, progression, beatLength);
      this.nextBeatTime += beatLength;
      this.beat++;
    }
  }

  private playBeat(time: number, beat: number, progression: Progression, beatLength: number): void {
    const out: Voice = { ...this.voice, out: this.bus };
    const chordIndex = Math.floor(beat / 8) % progression.chords.length;
    const chord = progression.chords[chordIndex];
    const beatInChord = beat % 8;

    if (beatInChord === 0) this.pad(time, chord, beatLength * 8);
    if (beatInChord % 4 === 0) this.bass(time, chord[0] - 12, beatLength * 1.8);

    for (let sub = 0; sub < progression.arpRate; sub++) {
      const step = beatInChord * progression.arpRate + sub;
      const note = chord[step % chord.length] + (step % 8 >= 4 ? 12 : 0) + 12;
      const at = time + (sub * beatLength) / progression.arpRate;
      bell(out, at, midiToFrequency(note), { gain: 0.035, duration: beatLength * 1.2, ratio: 2, index: 0.7 });
    }
    if (beatInChord % 2 === 1) this.shaker(time + beatLength / 2);
  }

  private pad(time: number, chord: readonly number[], duration: number): void {
    const { ctx } = this.voice;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, time);
    filter.frequency.linearRampToValueAtTime(1_400, time + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(800, time + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(0.05, time + 1.2);
    amp.gain.setValueAtTime(0.05, time + duration - 0.6);
    amp.gain.linearRampToValueAtTime(0.0001, time + duration + 0.4);
    filter.connect(amp).connect(this.bus);
    for (const midi of chord) {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiToFrequency(midi);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + duration + 0.5);
      }
    }
  }

  private bass(time: number, midi: number, duration: number): void {
    const { ctx } = this.voice;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToFrequency(midi);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(0.12, time + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(amp).connect(this.bus);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private shaker(time: number): void {
    const { ctx } = this.voice;
    const source = ctx.createBufferSource();
    source.buffer = this.voice.noise.white;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 7_000;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(0.018, time + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    source.connect(high).connect(amp).connect(this.bus);
    source.start(time, Math.random());
    source.stop(time + 0.1);
  }
}
