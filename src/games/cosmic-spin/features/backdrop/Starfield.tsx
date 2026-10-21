import { useEffect, useRef } from 'react';
import { presentationRng } from '../../game/engine/rng';

interface Star {
  x: number;
  y: number;
  size: number;
  layer: number;
  phase: number;
  speed: number;
}

interface Trail {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const LAYER_DRIFT = [0.004, 0.009, 0.016];
const LAYER_PARALLAX = [4, 10, 18];

/**
 * Layered, slowly drifting stars with a gentle pointer parallax and an
 * occasional golden energy trail. One canvas, capped pixel ratio and star
 * count; it stops drawing while the tab is hidden and renders a still frame
 * under reduced motion.
 */
export function Starfield({ reducedMotion, intensity = 1 }: { reducedMotion: boolean; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rng = presentationRng();
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const trails: Trail[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let frame = 0;
    let last = performance.now();
    let nextTrail = last + 2_500;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const cores = navigator.hardwareConcurrency ?? 4;
      const budget = Math.min(cores >= 8 ? 260 : 160, Math.round((width * height) / 5_500)) * intensity;
      stars = Array.from({ length: Math.max(40, Math.round(budget)) }, () => {
        const layer = rng() < 0.6 ? 0 : rng() < 0.75 ? 1 : 2;
        return { x: rng() * width, y: rng() * height, size: 0.4 + layer * 0.45 + rng() * 0.5, layer, phase: rng() * Math.PI * 2, speed: 0.6 + rng() * 1.6 };
      });
    };

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        if (!reducedMotion) {
          star.x -= LAYER_DRIFT[star.layer] * dt;
          if (star.x < -4) star.x = width + 4;
        }
        const twinkle = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(now * 0.001 * star.speed + star.phase);
        const px = star.x + pointer.x * LAYER_PARALLAX[star.layer];
        const py = star.y + pointer.y * LAYER_PARALLAX[star.layer];
        ctx.globalAlpha = twinkle * (0.35 + star.layer * 0.25);
        ctx.fillStyle = star.layer === 2 ? '#ffe6a0' : '#dfe6ff';
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion && now > nextTrail) {
        nextTrail = now + 4_000 + rng() * 7_000;
        trails.push({ x: width * (0.3 + rng() * 0.7), y: -20, vx: -(0.35 + rng() * 0.25), vy: 0.22 + rng() * 0.12, life: 1 });
      }
      for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        trail.x += trail.vx * dt;
        trail.y += trail.vy * dt;
        trail.life -= dt / 1_600;
        if (trail.life <= 0) {
          trails.splice(i, 1);
          continue;
        }
        const gradient = ctx.createLinearGradient(trail.x, trail.y, trail.x - trail.vx * 220, trail.y - trail.vy * 220);
        gradient.addColorStop(0, `rgba(255, 220, 140, ${0.85 * trail.life})`);
        gradient.addColorStop(1, 'rgba(255, 194, 71, 0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y);
        ctx.lineTo(trail.x - trail.vx * 220, trail.y - trail.vy * 220);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * -1;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * -1;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    frame = requestAnimationFrame(draw);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            resize();
            if (reducedMotion) draw(performance.now());
          });
    observer?.observe(canvas);
    if (!reducedMotion) window.addEventListener('pointermove', onPointerMove);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reducedMotion, intensity]);

  return <canvas ref={canvasRef} className="cs-starfield" aria-hidden="true" />;
}
