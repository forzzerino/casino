/**
 * Synthesized sound effects. Every cue is built from small Web Audio graphs,
 * so the game needs no audio files; recorded files can replace any cue via the
 * asset manifest.
 */
import { bell, clack, midiToFrequency, swish, thump, type Voice } from '../../../shared/audio/primitives';
import type { SoundCue } from './cues';

export interface CueOptions {
  /** Reel index, scatter count, etc. — used to vary pitch. */
  readonly index?: number;
  readonly intensity?: number;
}

function tone(v: Voice, time: number, midi: number, o: { type?: OscillatorType; gain: number; attack?: number; decay: number; glideTo?: number }): void {
  const { ctx } = v;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(midiToFrequency(midi), time);
  if (o.glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(midiToFrequency(o.glideTo), time + o.decay);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(o.gain, time + (o.attack ?? 0.005));
  amp.gain.exponentialRampToValueAtTime(0.0001, time + (o.attack ?? 0.005) + o.decay);
  osc.connect(amp).connect(v.out);
  osc.start(time);
  osc.stop(time + (o.attack ?? 0.005) + o.decay + 0.05);
}

function arpeggio(v: Voice, time: number, midis: readonly number[], step: number, gain: number, duration: number): void {
  midis.forEach((midi, i) => bell(v, time + i * step, midiToFrequency(midi), { gain, duration, ratio: 2, index: 1.1 }));
}

function sparkle(v: Voice, time: number, count: number, gain: number): void {
  for (let i = 0; i < count; i++) {
    const midi = 96 + Math.floor(Math.random() * 12);
    bell(v, time + i * 0.045 + Math.random() * 0.02, midiToFrequency(midi), { gain: gain * (1 - i / (count + 2)), duration: 0.35, ratio: 3.5, index: 0.6 });
  }
}

function fanfare(v: Voice, time: number, root: number, gain: number, bars: number): void {
  const chord = [root, root + 4, root + 7, root + 12];
  arpeggio(v, time, chord, 0.08, gain, 0.9);
  for (let b = 1; b < bars; b++) arpeggio(v, time + 0.42 * b, chord.map((m) => m + (b % 2 ? 5 : 7)), 0.06, gain * 0.9, 0.8);
  const end = time + 0.42 * bars;
  [root, root + 7, root + 12, root + 16].forEach((m) => bell(v, end, midiToFrequency(m), { gain: gain * 0.8, duration: 1.6, ratio: 2, index: 0.9 }));
  sparkle(v, end, 8, gain * 0.5);
}

export function renderCue(v: Voice, cue: SoundCue, time: number, options: CueOptions = {}): void {
  const intensity = options.intensity ?? 1;
  const index = options.index ?? 0;
  switch (cue) {
    case 'click':
      clack(v, time, { frequency: 2_600, q: 6, decay: 0.03, gain: 0.12, ring: 0.2 });
      return;
    case 'toggle':
      clack(v, time, { frequency: 1_900, q: 5, decay: 0.04, gain: 0.14, ring: 0.35 });
      tone(v, time + 0.01, 88, { gain: 0.03, decay: 0.08 });
      return;
    case 'spinStart':
      swish(v, time, { from: 300, to: 2_400, duration: 0.28, gain: 0.16, q: 1.4 });
      tone(v, time, 52, { type: 'triangle', gain: 0.06, decay: 0.25, glideTo: 64 });
      return;
    case 'reelStop':
      thump(v, time, 70 + index * 6, 0.32 * intensity);
      clack(v, time + 0.004, { frequency: 1_300 + index * 120, q: 4, decay: 0.05, gain: 0.16 * intensity, ring: 0.4, pan: (index - 2) * 0.25 });
      return;
    case 'scatterLand':
      bell(v, time, midiToFrequency(76 + index * 3), { gain: 0.16, duration: 0.9, ratio: 3.5, index: 1.4 });
      sparkle(v, time + 0.05, 3, 0.05);
      return;
    case 'bonusLand':
      tone(v, time, 60 + index * 2, { type: 'sine', gain: 0.12, decay: 0.5, glideTo: 72 + index * 2 });
      bell(v, time + 0.03, midiToFrequency(79 + index * 2), { gain: 0.1, duration: 0.6, ratio: 1.5, index: 2 });
      return;
    case 'symbolMatch':
      arpeggio(v, time, [79, 84], 0.05, 0.08, 0.4);
      return;
    case 'winSmall':
      arpeggio(v, time, [72, 76, 79, 84], 0.07, 0.11, 0.6);
      sparkle(v, time + 0.25, 3, 0.04);
      return;
    case 'winBig':
      tone(v, time, 36, { type: 'triangle', gain: 0.2, decay: 0.8 });
      fanfare(v, time, 67, 0.12, 2);
      return;
    case 'winMega':
      swish(v, time, { from: 200, to: 6_000, duration: 0.9, gain: 0.14, q: 0.8 });
      tone(v, time + 0.85, 31, { type: 'triangle', gain: 0.24, decay: 1.2 });
      fanfare(v, time + 0.85, 69, 0.13, 4);
      return;
    case 'jackpot':
      swish(v, time, { from: 150, to: 7_000, duration: 1.1, gain: 0.15, q: 0.7 });
      tone(v, time + 1.05, 29, { type: 'triangle', gain: 0.26, decay: 1.6 });
      fanfare(v, time + 1.05, 72, 0.14, 5);
      sparkle(v, time + 2.4, 12, 0.07);
      return;
    case 'coinTick':
      tone(v, time, 93 + (index % 5), { type: 'triangle', gain: 0.035 * intensity, decay: 0.05 });
      return;
    case 'freeSpinsIntro':
      swish(v, time, { from: 400, to: 5_000, duration: 0.7, gain: 0.12, q: 1 });
      [64, 68, 71, 76].forEach((m, i) => bell(v, time + 0.5 + i * 0.09, midiToFrequency(m), { gain: 0.11, duration: 1.4, ratio: 2, index: 1 }));
      sparkle(v, time + 0.9, 8, 0.05);
      return;
    case 'bonusIntro': {
      // UFO warble: a sine with a fast wobble sweeping up.
      const { ctx } = v;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(880, time + 1.1);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 40;
      lfo.connect(lfoGain).connect(osc.frequency);
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, time);
      amp.gain.linearRampToValueAtTime(0.08, time + 0.15);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + 1.3);
      osc.connect(amp).connect(v.out);
      osc.start(time);
      lfo.start(time);
      osc.stop(time + 1.35);
      lfo.stop(time + 1.35);
      arpeggio(v, time + 1.1, [69, 73, 76, 81], 0.08, 0.1, 0.8);
      return;
    }
    case 'capsuleOpen':
      swish(v, time, { from: 6_000, to: 900, duration: 0.35, gain: 0.12, q: 2 });
      bell(v, time + 0.3, midiToFrequency(88), { gain: 0.13, duration: 0.8, ratio: 3.5, index: 1.2 });
      sparkle(v, time + 0.32, 6, 0.06);
      return;
    case 'bonusReward':
      fanfare(v, time, 72, 0.1, 1);
      return;
    case 'error':
      thump(v, time, 90, 0.25);
      tone(v, time + 0.08, 50, { type: 'triangle', gain: 0.06, decay: 0.18, glideTo: 46 });
      return;
  }
}

/** Soft whir under the spinning reels: band-passed noise with a little flutter. */
export class ReelWhir {
  private source: AudioBufferSourceNode | null = null;
  private amp: GainNode | null = null;

  constructor(private readonly voice: Voice) {}

  start(time: number): void {
    this.stop(time);
    const { ctx } = this.voice;
    const source = ctx.createBufferSource();
    source.buffer = this.voice.noise.pink;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.9;
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 18;
    const flutterGain = ctx.createGain();
    flutterGain.gain.value = 0.025;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(0.06, time + 0.15);
    flutter.connect(flutterGain).connect(amp.gain);
    source.connect(band).connect(amp).connect(this.voice.out);
    source.start(time);
    flutter.start(time);
    this.source = source;
    this.amp = amp;
    source.onended = () => flutter.stop();
  }

  stop(time: number): void {
    if (!this.source || !this.amp) return;
    this.amp.gain.cancelScheduledValues(time);
    this.amp.gain.setTargetAtTime(0.0001, time, 0.06);
    this.source.stop(time + 0.4);
    this.source = null;
    this.amp = null;
  }
}
