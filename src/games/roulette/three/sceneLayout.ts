import { Vector3 } from 'three';

/**
 * World placement of the table furniture (metres, +Y up, player sits toward +Z).
 * The felt surface is y = 0.
 */
export const WORLD = {
  floorY: -0.92,
  wheelCenter: new Vector3(-1.02, 0, -0.04),
  /** World position of the betting layout's (0, 0) corner — see game/betting/layout.ts. */
  layoutOrigin: { x: -0.4, z: -0.27 },
  table: { minX: -1.62, maxX: 1.3, minZ: -0.64, maxZ: 0.64, cornerRadius: 0.3 },
  /** Where the player's chips come from (the player's rail). */
  playerChipOrigin: new Vector3(0.28, 0.14, 0.62),
  /** The croupier's chip float. */
  dealerRack: new Vector3(-0.2, 0, -0.5),
  dealerChipOrigin: new Vector3(-0.2, 0.05, -0.5),
  /** Resting place of the win marker (dolly) between rounds. */
  markerRest: new Vector3(0.22, 0, -0.5),
} as const;

export interface Seat {
  /** Chair position on the floor plane (x, z) and facing angle. */
  readonly chair: { readonly x: number; readonly z: number; readonly rotation: number };
  /** Where this seat's chips travel from/to on the table. */
  readonly chipOrigin: Vector3;
}

export const BOT_SEATS: readonly Seat[] = [
  { chair: { x: -0.62, z: 1.0, rotation: Math.PI }, chipOrigin: new Vector3(-0.55, 0.14, 0.6) },
  { chair: { x: 1.02, z: 1.0, rotation: Math.PI }, chipOrigin: new Vector3(0.95, 0.14, 0.6) },
  { chair: { x: 1.68, z: 0.26, rotation: -Math.PI / 2 }, chipOrigin: new Vector3(1.22, 0.14, 0.24) },
  { chair: { x: 1.68, z: -0.38, rotation: -Math.PI / 2 }, chipOrigin: new Vector3(1.22, 0.14, -0.32) },
  { chair: { x: 0.78, z: -1.0, rotation: 0 }, chipOrigin: new Vector3(0.75, 0.14, -0.58) },
];
