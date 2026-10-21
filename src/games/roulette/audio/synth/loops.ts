import type { Voice } from '../../../../shared/audio/primitives';
import { clamp } from '../../../../shared/utils/math';

const SMOOTHING = 0.06;

/** Continuous ball-on-track roll: band-limited noise, pitch and level follow speed. */
export class RollingLoop {
  private readonly level: GainNode;
  private readonly band: BiquadFilterNode;
  private readonly hissLevel: GainNode;
  private readonly flutter: OscillatorNode;
  private readonly flutterDepth: GainNode;

  constructor(private readonly v: Voice) {
    const { ctx } = v;
    const source = ctx.createBufferSource();
    source.buffer = v.noise.white;
    source.loop = true;

    this.band = ctx.createBiquadFilter();
    this.band.type = 'bandpass';
    this.band.frequency.value = 900;
    this.band.Q.value = 0.9;
    this.level = ctx.createGain();
    this.level.gain.value = 0;

    const hiss = ctx.createBiquadFilter();
    hiss.type = 'highpass';
    hiss.frequency.value = 3800;
    this.hissLevel = ctx.createGain();
    this.hissLevel.gain.value = 0;

    // Amplitude flutter at the ball's revolution rate — the "whirr" of it passing.
    this.flutter = ctx.createOscillator();
    this.flutter.frequency.value = 2;
    this.flutterDepth = ctx.createGain();
    this.flutterDepth.gain.value = 0;
    this.flutter.connect(this.flutterDepth).connect(this.level.gain);

    source.connect(this.band).connect(this.level).connect(v.out);
    source.connect(hiss).connect(this.hissLevel).connect(v.out);
    source.start();
    this.flutter.start();
  }

  /** @param speed linear rolling speed in m/s @param revolutionsPerSecond for the flutter */
  set(speed: number, revolutionsPerSecond: number): void {
    const now = this.v.ctx.currentTime;
    const norm = clamp(speed / 6.5, 0, 1);
    const gain = speed > 0.05 ? 0.05 + 0.3 * norm ** 1.1 : 0;
    this.level.gain.setTargetAtTime(gain, now, SMOOTHING);
    this.flutterDepth.gain.setTargetAtTime(gain * 0.35, now, SMOOTHING);
    this.hissLevel.gain.setTargetAtTime(gain * 0.25, now, SMOOTHING);
    this.band.frequency.setTargetAtTime(420 + norm * 1500, now, SMOOTHING);
    this.flutter.frequency.setTargetAtTime(clamp(revolutionsPerSecond, 0.3, 6), now, SMOOTHING);
  }
}

/** Low rumble of the rotor bearing, proportional to angular speed. */
export class WheelLoop {
  private readonly level: GainNode;

  constructor(private readonly v: Voice) {
    const { ctx } = v;
    const source = ctx.createBufferSource();
    source.buffer = v.noise.brown;
    source.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 240;
    this.level = ctx.createGain();
    this.level.gain.value = 0;
    source.connect(lowpass).connect(this.level).connect(v.out);
    source.start();
  }

  /** @param angularVelocity rad/s; exactly 0 (a frozen table) is silent. */
  set(angularVelocity: number): void {
    const norm = clamp((Math.abs(angularVelocity) - 0.3) / 1.9, 0, 1);
    const level = angularVelocity === 0 ? 0 : 0.012 + norm * 0.13;
    this.level.gain.setTargetAtTime(level, this.v.ctx.currentTime, 0.2);
  }
}
