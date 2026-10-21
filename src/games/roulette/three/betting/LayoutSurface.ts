/**
 * The betting layout on the felt: painted texture, coordinate conversions and
 * all layout feedback — hover, selection, neighbour preview, winning number.
 */
import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  Vector3,
  type CanvasTexture,
} from 'three';
import { ALL_OUTSIDE_SPOTS } from '../../game/betting/betSpots';
import { LAYOUT, numberRect, outsideRegion, spotAnchor, spotRects, type Point2, type Rect } from '../../game/betting/layout';
import type { Translate } from '../../i18n';
import type { BetSpot } from '../../types/game';
import { WORLD } from '../sceneLayout';
import { createCanvas, toTexture } from '../textures/canvas';
import { LAYOUT_MARGIN, createLayoutCanvas, drawLayout } from '../textures/layoutTexture';
import { CHIP_HEIGHT, CHIP_RADIUS, type ChipFactory, type ChipLook } from './ChipFactory';

const SURFACE_Y = 0.0007;
const HIGHLIGHT_Y = 0.0013;
const CELL_INSET = 0.006;

/** Soft-edged rounded rectangle used as the mask of every highlight plane. */
function createHighlightMask(): CanvasTexture {
  const size = 128;
  const { canvas, ctx } = createCanvas(size, size);
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(8, 8, size - 16, size - 16, 16);
  ctx.fill();
  return toTexture(canvas, { color: false });
}

class HighlightLayer {
  readonly group = new Group();
  private readonly meshes: Mesh[] = [];

  constructor(
    private readonly geometry: PlaneGeometry,
    readonly material: MeshBasicMaterial,
    private readonly toWorld: (p: Point2) => Vector3,
    private readonly y: number,
  ) {}

  show(rects: readonly Rect[], inset = CELL_INSET): void {
    while (this.meshes.length < rects.length) {
      const mesh = new Mesh(this.geometry, this.material);
      mesh.renderOrder = 2;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
    this.meshes.forEach((mesh, i) => {
      const rect = rects[i];
      mesh.visible = rect !== undefined;
      if (!rect) return;
      const center = this.toWorld({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
      mesh.position.set(center.x, this.y, center.z);
      mesh.scale.set(Math.max(0.001, rect.w - inset * 2), 1, Math.max(0.001, rect.h - inset * 2));
    });
  }

  hide(): void {
    this.meshes.forEach((mesh) => (mesh.visible = false));
  }
}

export class LayoutSurface {
  readonly group = new Group();
  private readonly canvas = createLayoutCanvas();
  private readonly texture: CanvasTexture;
  private readonly surfaceMaterial: MeshStandardMaterial;
  private readonly planeGeometry: PlaneGeometry;
  private readonly highlightGeometry = new PlaneGeometry(1, 1);
  private readonly mask = createHighlightMask();
  private readonly hover: HighlightLayer;
  private readonly selection: HighlightLayer;
  private readonly preview: HighlightLayer;
  private readonly winning: HighlightLayer;
  private readonly winningOutside: HighlightLayer;
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private ghost: Mesh | null = null;
  private ghostLookKey = '';
  private hasWinner = false;
  private hasSelection = false;

  constructor(private readonly chips: ChipFactory) {
    this.group.name = 'layout-surface';
    this.texture = toTexture(this.canvas, { anisotropy: 16 });
    this.surfaceMaterial = new MeshStandardMaterial({
      map: this.texture,
      transparent: true,
      roughness: 0.92,
      depthWrite: false,
    });
    const width = LAYOUT.width + LAYOUT_MARGIN * 2;
    const height = LAYOUT.height + LAYOUT_MARGIN * 2;
    this.planeGeometry = new PlaneGeometry(width, height);
    this.planeGeometry.rotateX(-Math.PI / 2);
    const surface = new Mesh(this.planeGeometry, this.surfaceMaterial);
    surface.position.set(WORLD.layoutOrigin.x + LAYOUT.width / 2, SURFACE_Y, WORLD.layoutOrigin.z + LAYOUT.height / 2);
    surface.receiveShadow = true;
    surface.renderOrder = 1;
    this.group.add(surface);

    this.highlightGeometry.rotateX(-Math.PI / 2);
    const layer = (color: string, opacity: number, y = HIGHLIGHT_Y) => {
      const material = new MeshBasicMaterial({
        color: new Color(color),
        map: this.mask,
        transparent: true,
        opacity,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const l = new HighlightLayer(this.highlightGeometry, material, (p) => this.layoutToWorld(p), y);
      this.group.add(l.group);
      return l;
    };
    this.hover = layer('#fff1d6', 0.13);
    this.selection = layer('#e6c27a', 0.3);
    this.preview = layer('#e6c27a', 0.3);
    this.winningOutside = layer('#fff1d6', 0.09);
    this.winning = layer('#fff3d9', 0.4, HIGHLIGHT_Y + 0.0002);

    this.ringMaterial = new MeshBasicMaterial({ color: new Color('#e9c784'), transparent: true, opacity: 0.95, depthWrite: false });
    const ringGeometry = new RingGeometry(CHIP_RADIUS + 0.003, CHIP_RADIUS + 0.006, 48);
    ringGeometry.rotateX(-Math.PI / 2);
    this.ring = new Mesh(ringGeometry, this.ringMaterial);
    this.ring.visible = false;
    this.ring.renderOrder = 3;
    this.group.add(this.ring);
  }

  layoutToWorld(p: Point2, y = 0, out = new Vector3()): Vector3 {
    return out.set(WORLD.layoutOrigin.x + p.x, y, WORLD.layoutOrigin.z + p.y);
  }

  worldToLayout(v: Vector3): Point2 {
    return { x: v.x - WORLD.layoutOrigin.x, y: v.z - WORLD.layoutOrigin.z };
  }

  anchorWorld(spot: BetSpot, y = 0, out = new Vector3()): Vector3 {
    return this.layoutToWorld(spotAnchor(spot), y, out);
  }

  draw(t: Translate): void {
    drawLayout(this.canvas, t);
    this.texture.needsUpdate = true;
  }

  /** Hover feedback plus a translucent preview of the chip that would be placed. */
  setHover(spot: BetSpot | null, look: ChipLook | null): void {
    if (!spot) {
      this.hover.hide();
      if (this.ghost) this.ghost.visible = false;
      return;
    }
    this.hover.show(spotRects(spot));
    if (!look) return;
    const key = `${look.palette.base}|${look.label}`;
    if (!this.ghost) {
      this.ghost = this.chips.create(look, 'ghost');
      this.ghost.renderOrder = 4;
      this.group.add(this.ghost);
    } else if (key !== this.ghostLookKey) {
      this.chips.setLook(this.ghost, look, 'ghost');
    }
    this.ghostLookKey = key;
    this.anchorWorld(spot, CHIP_HEIGHT / 2 + 0.012, this.ghost.position);
    this.ghost.visible = true;
  }

  setSelected(spot: BetSpot | null): void {
    this.hasSelection = spot !== null;
    if (!spot) {
      this.selection.hide();
      this.ring.visible = false;
      return;
    }
    this.selection.show(spotRects(spot));
    this.anchorWorld(spot, HIGHLIGHT_Y + 0.0004, this.ring.position);
    this.ring.visible = true;
  }

  setPreview(numbers: readonly number[]): void {
    if (numbers.length === 0) this.preview.hide();
    else this.preview.show(numbers.map(numberRect));
  }

  setWinning(result: number | null): void {
    this.hasWinner = result !== null;
    if (result === null) {
      this.winning.hide();
      this.winningOutside.hide();
      return;
    }
    this.winning.show([numberRect(result)]);
    const outside = ALL_OUTSIDE_SPOTS.filter((spot) => spot.numbers.includes(result))
      .map((spot) => outsideRegion(spot)?.rect)
      .filter((rect): rect is Rect => rect !== undefined);
    this.winningOutside.show(outside);
  }

  /** The selection fades back while betting is closed. */
  setInteractive(enabled: boolean): void {
    this.selection.material.opacity = enabled ? 0.3 : 0.08;
    this.ringMaterial.opacity = enabled ? 0.95 : 0.3;
    if (!enabled) this.setHover(null, null);
  }

  update(time: number): void {
    if (this.hasWinner) this.winning.material.opacity = 0.32 + 0.18 * (0.5 + 0.5 * Math.sin(time * 4.2));
    if (this.ghost?.visible) this.ghost.position.y = CHIP_HEIGHT / 2 + 0.01 + Math.sin(time * 3.2) * 0.002;
    if (this.hasSelection) this.ring.scale.setScalar(1 + Math.sin(time * 2.6) * 0.04);
  }

  dispose(): void {
    this.texture.dispose();
    this.mask.dispose();
    this.surfaceMaterial.dispose();
    this.planeGeometry.dispose();
    this.highlightGeometry.dispose();
    this.ring.geometry.dispose();
    this.ringMaterial.dispose();
    for (const layer of [this.hover, this.selection, this.preview, this.winning, this.winningOutside]) {
      layer.material.dispose();
    }
  }
}
