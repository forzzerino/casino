import { useEffect, useRef } from 'react';
import { presentationRng } from '../../game/engine/rng';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  angle: number;
  life: number;
  coin: boolean;
}

/**
 * Gold particle bursts on a canvas: coins and sparks thrown from the centre,
 * falling with gravity. `waves` > 1 keeps firing (mega wins). The particle
 * count adapts to screen size and CPU cores.
 */
export function ParticleBurst({ intensity, waves = 1 }: { intensity: number; waves?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rng = presentationRng();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const cores = navigator.hardwareConcurrency ?? 4;
    const perWave = Math.round(Math.min(cores >= 8 ? 140 : 80, (width * height) / 9_000) * intensity);
    const particles: Particle[] = [];
    let wavesLeft = waves;
    let nextWave = 0;
    let frame = 0;
    let last = performance.now();

    const fire = () => {
      for (let i = 0; i < perWave; i++) {
        const angle = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 1.4;
        const speed = 0.35 + rng() * 0.75;
        particles.push({
          x: width / 2 + (rng() - 0.5) * 60,
          y: height * 0.48,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + rng() * 6,
          spin: (rng() - 0.5) * 0.02,
          angle: rng() * Math.PI,
          life: 1,
          coin: rng() < 0.45,
        });
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (wavesLeft > 0 && now >= nextWave) {
        fire();
        wavesLeft--;
        nextWave = now + 650;
      }
      ctx.clearRect(0, 0, width, height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.0011 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        p.life -= dt / 2_600;
        if (p.life <= 0 || p.y > height + 20) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, p.life * 1.6);
        if (p.coin) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(Math.abs(Math.cos(p.angle)) + 0.15, 1);
          ctx.fillStyle = '#ffc247';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffe6a0';
          ctx.beginPath();
          ctx.arc(-p.size * 0.25, -p.size * 0.25, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#fff3c4';
          ctx.fillRect(p.x - p.size / 4, p.y - p.size / 4, p.size / 2, p.size / 2);
        }
      }
      ctx.globalAlpha = 1;
      if (particles.length > 0 || wavesLeft > 0) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [intensity, waves]);

  return <canvas ref={canvasRef} className="cs-particles" aria-hidden="true" />;
}
