/**
 * Cosmic Spin's audio manager. One AudioContext, created on the first user
 * gesture (browser autoplay policy), with independently controlled buses:
 *
 *   effects ─┐                       ┌─ reverb ─┐
 *   music   ─┴─ master ─ compressor ─┤          ├─ destination
 *
 * Optional recorded files (assets/manifest.ts) replace synthesized cues; a file
 * that is missing or fails to decode is skipped silently. Nothing here can
 * throw into the game.
 */
import { createNoiseBank, createRoomImpulse, type Voice } from '../../../shared/audio/primitives';
import { AUDIO_FILES } from '../assets/manifest';
import type { Settings } from '../state/gameTypes';
import { CUE_POLYPHONY, type SoundCue } from './cues';
import { CosmicMusic, type MusicMode } from './music';
import { ReelWhir, renderCue, type CueOptions } from './sfx';

type AudioSettings = Pick<Settings, 'master' | 'music' | 'effects' | 'musicOn' | 'effectsOn'>;

const MUSIC_TRIM = 0.6;
const POLYPHONY_WINDOW_S = 0.12;

export class SlotAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private effects: Voice | null = null;
  private music: CosmicMusic | null = null;
  private whir: ReelWhir | null = null;
  private settings: AudioSettings | null = null;
  private active = true;
  private readonly recent = new Map<SoundCue, number[]>();
  private readonly samples = new Map<SoundCue, AudioBuffer>();

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture (click / key press). */
  async unlock(settings: AudioSettings): Promise<void> {
    try {
      if (!this.ctx) this.build(settings);
      if (this.ctx && this.ctx.state !== 'running' && this.active && !document.hidden) await this.ctx.resume();
    } catch {
      // Audio is optional: the game stays fully playable without it.
    }
  }

  private build(settings: AudioSettings): void {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass({ latencyHint: 'interactive' });
    const noise = createNoiseBank(ctx, 2);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 3.5;
    compressor.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(compressor);

    const reverb = ctx.createConvolver();
    reverb.buffer = createRoomImpulse(ctx, 2.4, 2.6);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.7;
    reverb.connect(reverbReturn).connect(master);

    const bus = (send: number): GainNode => {
      const gain = ctx.createGain();
      gain.connect(master);
      const sendGain = ctx.createGain();
      sendGain.gain.value = send;
      gain.connect(sendGain).connect(reverb);
      return gain;
    };
    const musicBus = bus(0.35);
    const effectsBus = bus(0.18);

    this.ctx = ctx;
    this.master = master;
    this.musicBus = musicBus;
    this.effectsBus = effectsBus;
    this.effects = { ctx, out: effectsBus, noise };
    this.whir = new ReelWhir(this.effects);
    this.music = new CosmicMusic({ ctx, out: musicBus, noise });
    this.apply(settings, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    void this.loadSamples(ctx);
  }

  private async loadSamples(ctx: AudioContext): Promise<void> {
    await Promise.all(
      Object.entries(AUDIO_FILES).map(async ([cue, url]) => {
        if (!url || cue === 'music') return;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${response.status}`);
          this.samples.set(cue as SoundCue, await ctx.decodeAudioData(await response.arrayBuffer()));
        } catch {
          if (import.meta.env.DEV) console.info(`[cosmic-spin] audio file for "${cue}" unavailable — using the synthesized sound`);
        }
      }),
    );
  }

  private readonly onVisibilityChange = (): void => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (this.active) void this.ctx.resume();
  };

  /** False while the player is in the lobby: everything stays silent and suspended. */
  setActive(active: boolean): void {
    this.active = active;
    if (!this.ctx) return;
    if (active && !document.hidden) void this.ctx.resume();
    else if (!active) void this.ctx.suspend();
  }

  apply(settings: AudioSettings, immediate = false): void {
    this.settings = settings;
    if (!this.ctx || !this.master || !this.musicBus || !this.effectsBus) return;
    const now = this.ctx.currentTime;
    const set = (param: AudioParam, value: number) => (immediate ? param.setValueAtTime(value, now) : param.setTargetAtTime(value, now, 0.05));
    set(this.master.gain, settings.master);
    set(this.musicBus.gain, settings.musicOn ? settings.music * MUSIC_TRIM : 0);
    set(this.effectsBus.gain, settings.effectsOn ? settings.effects : 0);
    const audible = settings.musicOn && settings.music > 0.001 && settings.master > 0.001;
    if (audible) this.music?.start();
    else this.music?.stop();
  }

  setMusicMode(mode: MusicMode): void {
    this.music?.setMode(mode);
  }

  play(cue: SoundCue, options?: CueOptions): void {
    if (!this.ready || !this.ctx || !this.effects || !this.settings?.effectsOn) return;
    const now = this.ctx.currentTime;
    const limit = CUE_POLYPHONY[cue];
    if (limit !== undefined) {
      const recent = (this.recent.get(cue) ?? []).filter((t) => now - t < POLYPHONY_WINDOW_S);
      if (recent.length >= limit) return;
      recent.push(now);
      this.recent.set(cue, recent);
    }
    const sample = this.samples.get(cue);
    if (sample) {
      const source = this.ctx.createBufferSource();
      source.buffer = sample;
      source.connect(this.effects.out);
      source.start(now + 0.005);
      return;
    }
    renderCue(this.effects, cue, now + 0.005, options);
  }

  startReels(): void {
    if (this.ready && this.ctx && this.settings?.effectsOn) this.whir?.start(this.ctx.currentTime + 0.02);
  }

  stopReels(): void {
    if (this.ctx) this.whir?.stop(this.ctx.currentTime);
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.music?.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
