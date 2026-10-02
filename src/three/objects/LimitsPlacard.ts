import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  type BufferGeometry,
  type CanvasTexture,
} from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import type { Translate } from '../../i18n';
import { formatUSDWhole } from '../../utils/format';
import type { MaterialLibrary } from '../materials';
import { createCanvas, toTexture } from '../textures/canvas';

const WIDTH = 0.17;
const HEIGHT = 0.075;

/** Small brass-framed table-limits sign — localised like the rest of the UI. */
export class LimitsPlacard {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: CanvasTexture;
  private readonly faceMaterial: MeshStandardMaterial;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'limits-placard';
    this.group.position.set(1.02, 0, -0.47);
    this.group.rotation.y = -0.35;

    this.canvas = createCanvas(512, 226).canvas;
    this.texture = toTexture(this.canvas);
    this.faceMaterial = new MeshStandardMaterial({ map: this.texture, roughness: 0.4 });

    const base = new BoxGeometry(WIDTH * 0.7, 0.014, 0.05);
    const frame = new BoxGeometry(WIDTH + 0.008, HEIGHT + 0.008, 0.006);
    const face = new PlaneGeometry(WIDTH, HEIGHT);
    this.geometries.push(base, frame, face);

    const baseMesh = new Mesh(base, materials.brass);
    baseMesh.position.y = 0.007;
    baseMesh.castShadow = true;
    this.group.add(baseMesh);

    const panel = new Group();
    panel.position.set(0, 0.014 + HEIGHT / 2, 0);
    panel.rotation.x = -0.32;
    const frameMesh = new Mesh(frame, materials.brass);
    frameMesh.castShadow = true;
    const faceMesh = new Mesh(face, this.faceMaterial);
    faceMesh.position.z = 0.0032;
    panel.add(frameMesh, faceMesh);
    this.group.add(panel);
  }

  draw(t: Translate): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.fillStyle = '#121413';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(201, 169, 106, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, width - 28, height - 28);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9a96a';
    ctx.font = '600 30px Manrope, "Segoe UI", sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText(t('table.limitsTitle'), width / 2, 74);
    ctx.fillStyle = '#f1ece1';
    ctx.font = '600 44px "Cormorant Garamond", Georgia, serif';
    ctx.letterSpacing = '2px';
    const minimum = formatUSDWhole(GAME_CONFIG.chipDenominations[0] ?? 1);
    ctx.fillText(t('table.limits', { min: minimum, max: formatUSDWhole(GAME_CONFIG.maxBetPerSpot) }), width / 2, 146);
    ctx.letterSpacing = '0px';
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.texture.dispose();
    this.faceMaterial.dispose();
  }
}
