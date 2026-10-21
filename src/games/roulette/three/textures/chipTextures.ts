import type { ChipPalette } from '../../config/chipPalettes';
import { createCanvas } from './canvas';

/** 'casino' = value chip with edge spots (player); 'wheel' = striped colour chip (bots). */
export type ChipPattern = 'casino' | 'wheel';

const TOP_SIZE = 256;

export function drawChipTop(palette: ChipPalette, label: string, pattern: ChipPattern): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TOP_SIZE, TOP_SIZE);
  const c = TOP_SIZE / 2;

  ctx.fillStyle = palette.base;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.accent;
  if (pattern === 'casino') {
    // Six rectangular edge inserts.
    ctx.lineWidth = 24;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(c, c, c - 16, a - 0.17, a + 0.17);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(c, c, c * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Thin paired stripes — the look of a colour "wheel chip".
    ctx.lineWidth = 6;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      for (const offset of [-0.05, 0.05]) {
        ctx.beginPath();
        ctx.arc(c, c, c - 14, a + offset - 0.025, a + offset + 0.025);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = palette.inlay;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.56, 0, Math.PI * 2);
  ctx.fill();

  const size = label.length <= 2 ? 66 : label.length === 3 ? 56 : label.length === 4 ? 48 : 40;
  ctx.fillStyle = palette.text;
  ctx.font = `800 ${size}px Manrope, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c, c + 3);
  return canvas;
}

export function drawChipSide(palette: ChipPalette, pattern: ChipPattern): HTMLCanvasElement {
  const width = 256;
  const height = 32;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.accent;
  if (pattern === 'casino') {
    for (let k = 0; k < 6; k++) ctx.fillRect((k / 6) * width + 6, 4, 18, height - 8);
  } else {
    for (let k = 0; k < 8; k++) {
      const x = (k / 8) * width;
      ctx.fillRect(x + 4, 0, 3, height);
      ctx.fillRect(x + 11, 0, 3, height);
    }
  }
  return canvas;
}
