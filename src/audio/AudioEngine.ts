import type { SoundSettings } from '../types/ui';
import { AmbientBed } from './synth/ambient';
import { RollingLoop, WheelLoop } from './synth/loops';
import { LoungeMusic } from './synth/music';
import { createNoiseBank, createRoomImpulse, type Voice } from './synth/primitives';
import { renderSfx, type SfxName, type SfxOptions } from './synth/sfx';

/** Relative trims so that every slider at 100% still sits politely in the mix. */
const BUS_TRIM = { music: 0.55, effects: 1, ambient: 0.8 } as const;
const REVERB_SEND = { effects: 0.16, music: 0.22, ambient: 0.3 } as const;

/**
 * Owns the AudioContext and the mixing graph:
 *
 *   effects ─┐            ┌─ reverb ─┐
 *   music   ─┼─ (sends) ──┘          ├─ master ─ compressor ─ destination
 *   ambient ─┘───────────────────────┘
 *
 * The context can only start after a user gesture, so everything is created
 * lazily in {@link unlock}.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<'music' | 'effects' | 'ambient', GainNode> | null = null;
  private effectsVoice: Voice | null = null;
  private rolling: RollingLoop | null = null;
  private wheel: WheelLoop | null = null;
  private ambient: AmbientBed | null = null;
  private music: LoungeMusic | null = null;
  private settings: SoundSettings | null = null;

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  async unlock(settings: SoundSettings): Promise<void> {
    if (!this.ctx) this.build(settings);
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        // Autoplay policy may still block; sounds simply stay silent.
      }
    }
  }

  private build(settings: SoundSettings): void {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass({ latencyHint: 'interactive' });
    const noise = createNoiseBank(ctx);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    compressor.connect(ctx.destination);

    const master = ctx.createGain();
    master.connect(compressor);

    const reverb = ctx.createConvolver();
    reverb.buffer = createRoomImpulse(ctx);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.9;
    reverb.connect(reverbReturn).connect(master);

    const makeBus = (send: number): GainNode => {
      const bus = ctx.createGain();
      bus.connect(master);
      const sendGain = ctx.createGain();
      sendGain.gain.value = send;
      bus.connect(sendGain).connect(reverb);
      return bus;
    };

    const buses = {
      music: makeBus(REVERB_SEND.music),
      effects: makeBus(REVERB_SEND.effects),
      ambient: makeBus(REVERB_SEND.ambient),
    };

    this.ctx = ctx;
    this.master = master;
    this.buses = buses;
    this.effectsVoice = { ctx, out: buses.effects, noise };
    this.rolling = new RollingLoop(this.effectsVoice);
    this.wheel = new WheelLoop(this.effectsVoice);
    this.ambient = new AmbientBed({ ctx, out: buses.ambient, noise });
    this.music = new LoungeMusic({ ctx, out: buses.music, noise });

    this.applySettings(settings, true);
    this.ambient.start();

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  applySettings(settings: SoundSettings, immediate = false): void {
    this.settings = settings;
    if (!this.ctx || !this.master || !this.buses) return;
    const now = this.ctx.currentTime;
    const set = (param: AudioParam, value: number): void => {
      if (immediate) param.setValueAtTime(value, now);
      else param.setTargetAtTime(value, now, 0.05);
    };
    set(this.master.gain, settings.muted ? 0 : settings.master);
    set(this.buses.music.gain, settings.music * BUS_TRIM.music);
    set(this.buses.effects.gain, settings.effects * BUS_TRIM.effects);
    set(this.buses.ambient.gain, settings.ambient * BUS_TRIM.ambient);

    // Don't burn CPU on a track nobody can hear.
    const musicAudible = !settings.muted && settings.music > 0.001 && settings.master > 0.001;
    if (musicAudible) this.music?.start();
    else this.music?.stop();
  }

  play(name: SfxName, options?: SfxOptions): void {
    if (!this.ready || !this.effectsVoice || !this.ctx) return;
    if (this.settings?.muted) return;
    renderSfx(this.effectsVoice, name, this.ctx.currentTime + 0.005, options);
  }

  setBallRoll(speed: number, revolutionsPerSecond: number): void {
    if (this.ready) this.rolling?.set(speed, revolutionsPerSecond);
  }

  setWheelSpeed(angularVelocity: number): void {
    if (this.ready) this.wheel?.set(angularVelocity);
  }
}

export const audioEngine = new AudioEngine();
