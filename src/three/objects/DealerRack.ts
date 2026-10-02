import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type BufferGeometry,
} from 'three';
import { chipPaletteForDenomination } from '../../config/chipPalettes';
import { GAME_CONFIG } from '../../config/gameConfig';
import { CHIP_HEIGHT, type ChipFactory } from '../betting/ChipFactory';
import type { MaterialLibrary } from '../materials';
import { WORLD } from '../sceneLayout';
import { createCanvas, seededNoise, toTexture } from '../textures/canvas';

const COLUMNS = 9;
const ROWS = 2;
const SPACING_X = 0.064;
const SPACING_Z = 0.058;

/** Grey edge-spot texture; instance colours tint it per denomination. */
function createRackChipTexture() {
  const { canvas, ctx } = createCanvas(128, 16);
  ctx.fillStyle = '#b8b8b8';
  ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 6; k++) ctx.fillRect((k / 6) * 128 + 3, 2, 9, 12);
  return toTexture(canvas, { anisotropy: 2 });
}

/** The croupier's chip float — rows of colour-sorted stacks in a wooden tray. */
export class DealerRack {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly chipMaterial: MeshStandardMaterial;

  constructor(materials: MaterialLibrary, chips: ChipFactory) {
    this.group.name = 'dealer-rack';
    this.group.position.copy(WORLD.dealerRack);

    const width = COLUMNS * SPACING_X + 0.03;
    const depth = ROWS * SPACING_Z + 0.03;
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const geometry = new BoxGeometry(w, h, d);
      this.geometries.push(geometry);
      const mesh = new Mesh(geometry, materials.walnut);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };
    box(width, 0.008, depth, 0, 0.004, 0);
    box(width, 0.022, 0.012, 0, 0.011, -depth / 2);
    box(width, 0.022, 0.012, 0, 0.011, depth / 2);
    box(0.012, 0.022, depth, -width / 2, 0.011, 0);
    box(0.012, 0.022, depth, width / 2, 0.011, 0);

    this.chipMaterial = new MeshStandardMaterial({ map: createRackChipTexture(), roughness: 0.48 });
    const rand = seededNoise(42);
    const heights: number[] = [];
    for (let i = 0; i < COLUMNS * ROWS; i++) heights.push(9 + Math.floor(rand() * 13));
    const total = heights.reduce((a, b) => a + b, 0);
    const stacks = new InstancedMesh(chips.geometry, this.chipMaterial, total);
    const dummy = new Object3D();
    const denominations = GAME_CONFIG.chipDenominations;
    let index = 0;
    for (let col = 0; col < COLUMNS; col++) {
      const denomination = denominations[col % denominations.length];
      const color = new Color(chipPaletteForDenomination(denomination, denominations).base);
      for (let row = 0; row < ROWS; row++) {
        const height = heights[col * ROWS + row];
        for (let k = 0; k < height; k++) {
          dummy.position.set(
            (col - (COLUMNS - 1) / 2) * SPACING_X + (rand() - 0.5) * 0.0015,
            0.008 + CHIP_HEIGHT * (k + 0.5),
            (row - (ROWS - 1) / 2) * SPACING_Z + (rand() - 0.5) * 0.0015,
          );
          dummy.rotation.y = rand() * Math.PI * 2;
          dummy.updateMatrix();
          stacks.setMatrixAt(index, dummy.matrix);
          stacks.setColorAt(index, color);
          index++;
        }
      }
    }
    stacks.castShadow = true;
    stacks.receiveShadow = true;
    this.group.add(stacks);
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.chipMaterial.map?.dispose();
    this.chipMaterial.dispose();
  }
}
