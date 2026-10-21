/**
 * Low-level synthesis building blocks. Every sound in the game is generated
 * procedurally, so the project runs without audio assets; any voice can later be
 * swapped for a sampled recording without touching callers.
 */

export interface NoiseBank {
  readonly white: AudioBuffer;
  readonly pink: AudioBuffer;
  readonly brown: AudioBuffer;
}

export interface Voice {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly noise: NoiseBank;
}

export function createNoiseBank(ctx: AudioContext, seconds = 3): NoiseBank {
  const length = Math.floor(ctx.sampleRate * seconds);
  const make = (fill: (data: Float32Array) => void): AudioBuffer => {
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    fill(buffer.getChannelData(0));
    return buffer;
  };
  return {
    white: make((d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }),
    pink: make((d) => {
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
    }),
    brown: make((d) => {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    }),
  };
}

/** Synthetic room impulse response for a warm, medium-sized salon. */
export function createRoomImpulse(ctx: AudioContext, seconds = 1.8, decay = 3.2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) ** decay * (i < 200 ? i / 200 : 1);
    }
  }
  return buffer;
}

export const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

function envelope(gain: AudioParam, time: number, peak: number, attack: number, decay: number): void {
  gain.setValueAtTime(0.0001, time);
  gain.linearRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
  gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
}

export interface ClackOptions {
  readonly frequency: number;
  readonly q: number;
  readonly decay: number;
  readonly gain: number;
  /** Strength of the tonal resonance relative to the noise transient. */
  readonly ring?: number;
  readonly pan?: number;
}

/** Short filtered transient + resonance: chips, ball on frets, wood blocks. */
export function clack(v: Voice, time: number, o: ClackOptions): void {
  const { ctx } = v;
  const panner = ctx.createStereoPanner();
  panner.pan.value = o.pan ?? 0;
  panner.connect(v.out);

  const source = ctx.createBufferSource();
  source.buffer = v.noise.white;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = o.frequency;
  band.Q.value = o.q;
  const gain = ctx.createGain();
  envelope(gain.gain, time, o.gain, 0.0012, o.decay);
  source.connect(band).connect(gain).connect(panner);
  source.start(time, Math.random() * 2);
  source.stop(time + o.decay + 0.05);

  const ring = o.ring ?? 0.3;
  if (ring > 0) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = o.frequency * 0.86;
    const oscGain = ctx.createGain();
    envelope(oscGain.gain, time, o.gain * ring, 0.0008, o.decay * 1.6);
    osc.connect(oscGain).connect(panner);
    osc.start(time);
    osc.stop(time + o.decay * 1.6 + 0.05);
  }
}

export interface BellOptions {
  readonly gain: number;
  readonly duration: number;
  /** Modulator / carrier frequency ratio — 3.5 is bell-like, 1 is softer. */
  readonly ratio?: number;
  readonly index?: number;
}

/** Two-operator FM bell: soft chimes, vibraphone. */
export function bell(v: Voice, time: number, frequency: number, o: BellOptions): void {
  const { ctx } = v;
  const carrier = ctx.createOscillator();
  carrier.frequency.value = frequency;
  const modulator = ctx.createOscillator();
  modulator.frequency.value = frequency * (o.ratio ?? 3.5);
  const modGain = ctx.createGain();
  const index = frequency * (o.index ?? 1.6);
  modGain.gain.setValueAtTime(index, time);
  modGain.gain.exponentialRampToValueAtTime(Math.max(1, index * 0.02), time + o.duration * 0.6);
  modulator.connect(modGain).connect(carrier.frequency);

  const amp = ctx.createGain();
  envelope(amp.gain, time, o.gain, 0.004, o.duration);
  carrier.connect(amp).connect(v.out);
  carrier.start(time);
  modulator.start(time);
  carrier.stop(time + o.duration + 0.1);
  modulator.stop(time + o.duration + 0.1);
}

/** Electric-piano style tone for the lounge music. */
export function electricPiano(v: Voice, time: number, midi: number, velocity: number, duration: number): void {
  const { ctx } = v;
  const f = midiToFrequency(midi);
  const carrier = ctx.createOscillator();
  carrier.frequency.value = f;
  const modulator = ctx.createOscillator();
  modulator.frequency.value = f;
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(f * 1.4 * velocity, time);
  modGain.gain.exponentialRampToValueAtTime(f * 0.08, time + 0.45);
  modulator.connect(modGain).connect(carrier.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  const amp = ctx.createGain();
  envelope(amp.gain, time, 0.09 * velocity, 0.006, duration);
  carrier.connect(filter).connect(amp).connect(v.out);
  carrier.start(time);
  modulator.start(time);
  carrier.stop(time + duration + 0.1);
  modulator.stop(time + duration + 0.1);
}

/** Round upright-bass style note. */
export function bassNote(v: Voice, time: number, midi: number, velocity: number): void {
  const { ctx } = v;
  const f = midiToFrequency(midi);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = f;
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = f;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, time);
  filter.frequency.exponentialRampToValueAtTime(260, time + 0.35);
  const amp = ctx.createGain();
  envelope(amp.gain, time, 0.22 * velocity, 0.012, 0.75);
  osc.connect(filter);
  sub.connect(filter);
  filter.connect(amp).connect(v.out);
  osc.start(time);
  sub.start(time);
  osc.stop(time + 0.9);
  sub.stop(time + 0.9);
}

/** Filtered noise sweep — brushes, a chip sliding, the ball being flicked. */
export function swish(
  v: Voice,
  time: number,
  o: { from: number; to: number; duration: number; gain: number; q?: number; buffer?: AudioBuffer },
): void {
  const { ctx } = v;
  const source = ctx.createBufferSource();
  source.buffer = o.buffer ?? v.noise.white;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = o.q ?? 1.2;
  band.frequency.setValueAtTime(o.from, time);
  band.frequency.exponentialRampToValueAtTime(o.to, time + o.duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(o.gain, time + o.duration * 0.3);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + o.duration);
  source.connect(band).connect(amp).connect(v.out);
  source.start(time, Math.random() * 1.5);
  source.stop(time + o.duration + 0.05);
}

/** Muted low thump — used for gentle "not allowed" feedback. */
export function thump(v: Voice, time: number, frequency: number, gain: number): void {
  const { ctx } = v;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency * 1.25, time);
  osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.05);
  const amp = ctx.createGain();
  envelope(amp.gain, time, gain, 0.006, 0.12);
  osc.connect(amp).connect(v.out);
  osc.start(time);
  osc.stop(time + 0.2);
}
