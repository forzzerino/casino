#!/usr/bin/env node
/**
 * Builds the web-ready Cosmic Spin art from the raw art pack.
 *
 *   node scripts/build-cosmic-spin-assets.mjs [sourceDir]
 *
 * sourceDir defaults to `cosmicspin/reference` (the art pack as delivered, with
 * its original file names). Output goes to `public/assets/cosmic-spin/`, which
 * is what the game loads (see src/games/cosmic-spin/assets/manifest.ts).
 * Requires `ffmpeg` (with libwebp) on the PATH.
 *
 * Besides resizing and WebP conversion it:
 *  - pads the 499×500 multiplier symbol to a square like the others,
 *  - renders vertically motion-blurred copies of every symbol for spinning reels,
 *  - extracts the gold rims of the slot frame into an overlay (symbols spin under it),
 *  - turns the effect sheets into single-row sprite strips with real transparency.
 *    The JPEG sheets have a grey/checkerboard background baked in (and the PNG
 *    sheets a semi-opaque haze), so the background level is subtracted and the
 *    remaining glow becomes alpha.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(root, process.argv[2] ?? 'cosmicspin/reference');
const out = path.resolve(root, 'public/assets/cosmic-spin');

function ffmpeg(args, input) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { input, maxBuffer: 1 << 30 });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${result.stderr}`);
  return result.stdout;
}

function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  for (let i = 2; i < b.length; ) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xc2) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`Unknown image format: ${file}`);
}

const input = (rel) => {
  const file = path.join(src, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing source asset: ${rel}`);
  return file;
};

function target(rel) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

const webp = (quality, alpha) => ['-c:v', 'libwebp', '-quality', String(quality), '-pix_fmt', alpha ? 'yuva420p' : 'yuv420p', '-frames:v', '1'];

function convert(from, to, filter, quality, alpha) {
  ffmpeg(['-i', input(from), ...(filter ? ['-vf', filter] : []), ...webp(quality, alpha), target(to)]);
}

/** Runs `transform` over raw RGBA pixels, then encodes the result. */
function processPixels(from, to, transform, filter, quality, alpha) {
  const file = input(from);
  const { w, h } = imageSize(file);
  const pixels = ffmpeg(['-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
  transform(pixels, w, h);
  ffmpeg(
    ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', ...(filter ? ['-vf', filter] : []), ...webp(quality, alpha), target(to)],
    pixels,
  );
}

/**
 * Glow on transparency: subtract the baked background level (premultiplying any
 * existing alpha) to get "light on black", then turn brightness into alpha and
 * un-premultiply the colour. Normal alpha compositing then looks like additive
 * light on dark scenes, without needing blend modes (which stacking contexts break).
 */
function glowToAlpha(blackPoint, blankGrid) {
  return (px, w, h) => {
    const gain = 255 / (255 - blackPoint);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = px[i + 3] / 255;
        const onGrid = blankGrid && blankGrid(x, y);
        let r = 0;
        let g = 0;
        let b = 0;
        if (!onGrid) {
          r = Math.min(255, Math.max(0, px[i] * a - blackPoint) * gain);
          g = Math.min(255, Math.max(0, px[i + 1] * a - blackPoint) * gain);
          b = Math.min(255, Math.max(0, px[i + 2] * a - blackPoint) * gain);
        }
        const alpha = Math.max(r, g, b);
        const scale = alpha > 0 ? 255 / alpha : 0;
        px[i] = Math.round(r * scale);
        px[i + 1] = Math.round(g * scale);
        px[i + 2] = Math.round(b * scale);
        px[i + 3] = Math.round(alpha);
      }
    }
  };
}

const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const SYMBOLS = {
  'symbols/regular/alien.png': 'alien',
  'symbols/regular/rocket.png': 'rocket',
  'symbols/regular/planet.png': 'planet',
  'symbols/regular/moon.png': 'moon',
  'symbols/regular/star.png': 'star',
  'symbols/regular/crystal.png': 'crystal',
  'symbols/regular/astronout.png': 'helmet',
  'symbols/regular/robot.png': 'robot',
  'symbols/regular/ufo.png': 'ufo',
  'symbols/regular/energycore.png': 'core',
  'symbols/regular/satallite.png': 'satellite',
  'symbols/regular/meteor.png': 'meteor',
  'symbols/special/wild.png': 'wild',
  'symbols/special/scatter.png': 'scatter',
  'symbols/special/bonus.png': 'bonus',
  'symbols/special/multiplier.png': 'multiplier',
};

const steps = [];
const step = (label, run) => steps.push([label, run]);

for (const [from, id] of Object.entries(SYMBOLS)) {
  const kind = from.includes('/special/') ? 'special' : 'regular';
  const square = 'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';
  step(`symbol ${id}`, () => convert(from, `symbols/${kind}/${id}.webp`, `${square},scale=384:384:flags=lanczos`, 90, true));
  step(`blurred ${id}`, () =>
    convert(from, `symbols/blur/${id}.webp`, `${square},scale=192:192:flags=bicubic,format=yuva444p,avgblur=sizeX=1:sizeY=9`, 75, true),
  );
}

for (const [from, id] of [
  ['symbols/backgrounds/backgroundsbase-space.png', 'base-space'],
  ['symbols/backgrounds/backgroundsfree-spins.png', 'free-spins'],
  ['symbols/backgrounds/backgroundsbonus-station.png', 'bonus-station'],
]) {
  step(`background ${id}`, () => convert(from, `backgrounds/${id}.webp`, null, 80, false));
  step(`background ${id} (small)`, () => convert(from, `backgrounds/${id}-960.webp`, 'scale=960:-2:flags=lanczos', 78, false));
}

const FRAME = 'publicassetscosmic-spinuislot-frame.png';
step('slot frame', () => convert(FRAME, 'ui/slot-frame.webp', null, 90, true));
step('slot frame rims', () =>
  processPixels(
    FRAME,
    'ui/slot-frame-rims.webp',
    (px) => {
      for (let i = 0; i < px.length; i += 4) {
        const lum = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
        px[i + 3] = Math.round(px[i + 3] * smoothstep(48, 115, lum));
      }
    },
    null,
    90,
    true,
  ),
);

for (const [from, id] of [
  ['mascot/publicassetscosmic-spinmascotmascot-master.png', 'idle'],
  ['mascot/happy.png', 'happy'],
  ['mascot/surprised.png', 'surprised'],
  ['mascot/big-win.png', 'big-win'],
  ['mascot/losing.png', 'losing'],
]) {
  step(`mascot ${id}`, () => convert(from, `mascot/${id}.webp`, 'scale=512:768:flags=lanczos', 86, true));
}

// Effect strips: [source, output, black point, grid cols×rows, skip first frames, frame size, grid lines to blank]
const near = (v, period, tolerance) => {
  const r = v % period;
  return r < tolerance || period - r < tolerance;
};
const EFFECTS = [
  ['effects/gold-particle-sheet.png', 'gold-sparkle', 24, [5, 4], 0, [200, 167], null],
  ['effects/coin-burst.jpg', 'coin-burst', 60, [4, 4], 1, [420, 234], null],
  ['effects/wild-aura.jpg', 'wild-aura', 28, [4, 4], 0, [300, 168], null],
  ['effects/scatter-burst.jpg', 'scatter-burst', 28, [4, 4], 0, [340, 190], (x, y) => near(x, 688, 6) || near(y, 384, 6)],
];
for (const [from, id, blackPoint, [cols, rows], skip, [fw, fh], grid] of EFFECTS) {
  const frames = cols * rows - skip;
  const select = skip > 0 ? `select='gte(n\\,${skip})',` : '';
  step(`effect ${id}`, () =>
    processPixels(
      from,
      `effects/${id}.webp`,
      glowToAlpha(blackPoint, grid),
      // untile needs a size divisible by the grid; trimming at most a few pixels is invisible.
      `crop=trunc(iw/${cols})*${cols}:trunc(ih/${rows})*${rows}:0:0,untile=${cols}x${rows},${select}scale=${fw}:${fh}:flags=lanczos,tile=${frames}x1`,
      82,
      true,
    ),
  );
}

let total = 0;
for (const [label, run] of steps) {
  run();
  total++;
  process.stdout.write(`\r${total}/${steps.length} ${label.padEnd(40)}`);
}
const size = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, d) => {
    const p = path.join(dir, d.name);
    return sum + (d.isDirectory() ? size(p) : fs.statSync(p).size);
  }, 0);
console.log(`\nWrote ${total} assets to ${path.relative(root, out)} (${(size(out) / 1024 / 1024).toFixed(2)} MB)`);
