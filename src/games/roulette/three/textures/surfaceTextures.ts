/**
 * Procedural surface textures (felt, wood, carpet, wall panelling, glows).
 * Small, tileable and generated once — no external image assets required.
 */
import type { CanvasTexture } from 'three';
import { createCanvas, seededNoise, toTexture } from './canvas';

/** Fine fibre noise, near-white so it modulates the felt colour subtly. */
export function createFeltTexture(): CanvasTexture {
  const size = 512;
  const { canvas, ctx } = createCanvas(size, size);
  const image = ctx.createImageData(size, size);
  const rand = seededNoise(7);
  for (let i = 0; i < size * size; i++) {
    const fibre = 0.86 + rand() * 0.14;
    const v = Math.round(fibre * 255);
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  // A few soft directional streaks give the nap of the cloth.
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 260; i++) {
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(0, y, size, 1 + rand() * 2);
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas, { repeat: true });
}

/** Long-grain walnut with darker figure lines. */
export function createWoodTexture(base = '#5b3720', seed = 3): CanvasTexture {
  const w = 1024;
  const h = 1024;
  const { canvas, ctx } = createCanvas(w, h);
  const rand = seededNoise(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 220; i++) {
    const y0 = rand() * h;
    const amplitude = 4 + rand() * 18;
    const wavelength = 180 + rand() * 420;
    const phase = rand() * Math.PI * 2;
    const dark = rand() > 0.35;
    ctx.strokeStyle = dark ? `rgba(20, 10, 4, ${0.08 + rand() * 0.18})` : `rgba(160, 104, 60, ${0.05 + rand() * 0.1})`;
    ctx.lineWidth = 0.6 + rand() * 2.6;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x / wavelength + phase) * amplitude + Math.sin(x / 37 + phase) * 0.8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Pores
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(15, 8, 3, ${rand() * 0.25})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
  }
  return toTexture(canvas, { repeat: true });
}

/** Dark burgundy carpet with a restrained gold lattice — mostly lost in shadow. */
export function createCarpetTexture(): CanvasTexture {
  const size = 512;
  const { canvas, ctx } = createCanvas(size, size);
  const rand = seededNoise(11);
  ctx.fillStyle = '#2a1515';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '70,30,28' : '10,5,5'}, ${rand() * 0.35})`;
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }
  ctx.strokeStyle = 'rgba(176, 132, 72, 0.32)';
  ctx.lineWidth = 3;
  const cell = size / 4;
  for (let gx = 0; gx <= 4; gx++) {
    for (let gy = 0; gy <= 4; gy++) {
      const cx = gx * cell;
      const cy = gy * cell;
      ctx.beginPath();
      ctx.moveTo(cx, cy - cell / 2);
      ctx.lineTo(cx + cell / 2, cy);
      ctx.lineTo(cx, cy + cell / 2);
      ctx.lineTo(cx - cell / 2, cy);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(176, 132, 72, 0.28)';
      ctx.beginPath();
      ctx.arc(cx + cell / 2, cy + cell / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return toTexture(canvas, { repeat: true });
}

/** Vertical wood slats with thin brass reveals, for the distant walls. */
export function createWallTexture(): CanvasTexture {
  const w = 512;
  const h = 512;
  const { canvas, ctx } = createCanvas(w, h);
  const rand = seededNoise(19);
  ctx.fillStyle = '#1c120c';
  ctx.fillRect(0, 0, w, h);
  const slats = 8;
  for (let i = 0; i < slats; i++) {
    const x = (i / slats) * w;
    const shade = 22 + Math.floor(rand() * 10);
    ctx.fillStyle = `rgb(${shade + 8}, ${shade}, ${shade - 8})`;
    ctx.fillRect(x + 3, 0, w / slats - 6, h);
    ctx.fillStyle = 'rgba(190, 150, 90, 0.35)';
    ctx.fillRect(x, 0, 2, h);
  }
  ctx.fillStyle = 'rgba(190, 150, 90, 0.25)';
  ctx.fillRect(0, h * 0.62, w, 3);
  return toTexture(canvas, { repeat: true });
}

/** Soft radial falloff used for light pools and lamp halos (white, alpha in luminance). */
export function createGlowTexture(): CanvasTexture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, { color: false });
}
