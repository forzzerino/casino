import { clack, type Voice } from './primitives';

const MURMUR_VOICES = 5;

/**
 * Casino room bed: low room tone, a soft crowd murmur made of band-passed noise
 * with wandering levels, and the occasional distant clink of chips.
 */
export class AmbientBed {
  private readonly murmurGains: GainNode[] = [];
  private readonly murmurFilters: BiquadFilterNode[] = [];
  private murmurTimer: ReturnType<typeof setInterval> | null = null;
  private chipsTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly distant: Voice;

  constructor(private readonly v: Voice) {
    const { ctx } = v;

    const room = ctx.createBufferSource();
    room.buffer = v.noise.brown;
    room.loop = true;
    const roomFilter = ctx.createBiquadFilter();
    roomFilter.type = 'lowpass';
    roomFilter.frequency.value = 260;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.22;
    room.connect(roomFilter).connect(roomGain).connect(v.out);
    room.start();

    for (let i = 0; i < MURMUR_VOICES; i++) {
      const source = ctx.createBufferSource();
      source.buffer = v.noise.pink;
      source.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 380 + Math.random() * 700;
      band.Q.value = 2.4;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i / (MURMUR_VOICES - 1)) * 1.6 - 0.8;
      source.connect(band).connect(gain).connect(pan).connect(v.out);
      source.start(0, Math.random() * 2);
      this.murmurGains.push(gain);
      this.murmurFilters.push(band);
    }

    // Distant sounds are muffled.
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 2400;
    muffle.connect(v.out);
    this.distant = { ctx, out: muffle, noise: v.noise };
  }

  start(): void {
    if (this.murmurTimer !== null) return;
    this.murmurTimer = setInterval(() => this.wanderMurmur(), 280);
    this.scheduleDistantChips();
  }

  stop(): void {
    if (this.murmurTimer !== null) clearInterval(this.murmurTimer);
    if (this.chipsTimer !== null) clearTimeout(this.chipsTimer);
    this.murmurTimer = null;
    this.chipsTimer = null;
  }

  private wanderMurmur(): void {
    const now = this.v.ctx.currentTime;
    this.murmurGains.forEach((gain, i) => {
      if (Math.random() < 0.45) gain.gain.setTargetAtTime(Math.random() ** 2 * 0.075, now, 0.18);
      if (Math.random() < 0.1) {
        this.murmurFilters[i].frequency.setTargetAtTime(380 + Math.random() * 700, now, 0.4);
      }
    });
  }

  private scheduleDistantChips(): void {
    this.chipsTimer = setTimeout(
      () => {
        const t = this.v.ctx.currentTime + 0.02;
        const count = 2 + Math.floor(Math.random() * 4);
        const pan = Math.random() * 1.6 - 0.8;
        for (let k = 0; k < count; k++) {
          clack(this.distant, t + k * (0.04 + Math.random() * 0.05), {
            frequency: 2400 + Math.random() * 500,
            q: 3,
            decay: 0.03,
            gain: 0.05 * Math.random() + 0.02,
            ring: 0.2,
            pan,
          });
        }
        this.scheduleDistantChips();
      },
      2500 + Math.random() * 6000,
    );
  }
}
