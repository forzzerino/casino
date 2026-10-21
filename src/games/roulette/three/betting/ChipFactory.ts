import {
  CircleGeometry,
  Color,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ChipPalette } from '../../config/chipPalettes';
import { toTexture } from '../textures/canvas';
import { drawChipSide, drawChipTop, type ChipPattern } from '../textures/chipTextures';

/** Slightly larger than a real 39 mm chip so values stay legible from the player's seat. */
export const CHIP_RADIUS = 0.0235;
export const CHIP_HEIGHT = 0.0072;
const BEVEL = 0.0009;
const SEGMENTS = 48;

export interface ChipLook {
  readonly palette: ChipPalette;
  readonly label: string;
  readonly pattern: ChipPattern;
}

export type ChipShade = 'normal' | 'dimmed' | 'ghost';

function lookKey(look: ChipLook): string {
  return `${look.pattern}|${look.palette.base}|${look.palette.accent}|${look.label}`;
}

/** Bevelled chip body: lathe side + flat caps, merged with material groups [side, top, bottom]. */
function createChipGeometry(): BufferGeometry {
  const h = CHIP_HEIGHT / 2;
  const side = new LatheGeometry(
    [
      new Vector2(CHIP_RADIUS - BEVEL, -h),
      new Vector2(CHIP_RADIUS, -h + BEVEL),
      new Vector2(CHIP_RADIUS, h - BEVEL),
      new Vector2(CHIP_RADIUS - BEVEL, h),
    ],
    SEGMENTS,
  );
  const top = new CircleGeometry(CHIP_RADIUS - BEVEL, SEGMENTS);
  top.rotateX(-Math.PI / 2);
  top.translate(0, h, 0);
  const bottom = new CircleGeometry(CHIP_RADIUS - BEVEL, SEGMENTS);
  bottom.rotateX(Math.PI / 2);
  bottom.translate(0, -h, 0);
  const merged = mergeGeometries([side, top, bottom], true);
  side.dispose();
  top.dispose();
  bottom.dispose();
  return merged;
}

/**
 * Builds chip meshes and caches their materials per look (palette + label), so a
 * hundred $25 chips share one set of GPU textures.
 */
export class ChipFactory {
  readonly geometry = createChipGeometry();
  private readonly cache = new Map<string, Material[]>();
  private readonly textures: Texture[] = [];

  materials(look: ChipLook, shade: ChipShade = 'normal'): Material[] {
    const key = `${lookKey(look)}|${shade}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const base = shade === 'normal' ? null : this.materials(look, 'normal');
    let created: Material[];
    if (base) {
      created = base.map((m) => {
        const clone = (m as MeshStandardMaterial).clone();
        if (shade === 'dimmed') clone.color = new Color('#4a4a4a');
        if (shade === 'ghost') {
          clone.transparent = true;
          clone.opacity = 0.5;
          clone.depthWrite = false;
        }
        return clone;
      });
    } else {
      const sideMap = toTexture(drawChipSide(look.palette, look.pattern), { anisotropy: 4 });
      const topMap = toTexture(drawChipTop(look.palette, look.label, look.pattern), { anisotropy: 8 });
      this.textures.push(sideMap, topMap);
      const side = new MeshStandardMaterial({ map: sideMap, roughness: 0.5 });
      const top = new MeshStandardMaterial({ map: topMap, roughness: 0.38 });
      created = [side, top, top];
    }
    this.cache.set(key, created);
    return created;
  }

  create(look: ChipLook, shade: ChipShade = 'normal'): Mesh {
    const mesh = new Mesh(this.geometry, this.materials(look, shade));
    mesh.castShadow = shade !== 'ghost';
    mesh.receiveShadow = shade !== 'ghost';
    return mesh;
  }

  setLook(mesh: Mesh, look: ChipLook, shade: ChipShade = 'normal'): void {
    mesh.material = this.materials(look, shade);
  }

  dispose(): void {
    const materials = new Set<Material>();
    for (const list of this.cache.values()) list.forEach((m) => materials.add(m));
    materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.cache.clear();
    this.textures.length = 0;
    this.geometry.dispose();
  }
}
