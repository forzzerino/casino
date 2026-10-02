/**
 * One shared library of simple PBR materials. Realism comes from good values
 * and lighting here, not from custom shaders.
 */
import {
  Color,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
} from 'three';
import { createFeltTexture, createWoodTexture } from './textures/surfaceTextures';

export interface MaterialLibrary {
  readonly felt: MeshStandardMaterial;
  readonly walnut: MeshPhysicalMaterial;
  readonly walnutMatte: MeshStandardMaterial;
  readonly lacquer: MeshPhysicalMaterial;
  readonly rotorWood: MeshPhysicalMaterial;
  readonly leather: MeshPhysicalMaterial;
  readonly brass: MeshStandardMaterial;
  readonly brassSatin: MeshStandardMaterial;
  readonly chrome: MeshStandardMaterial;
  readonly darkMetal: MeshStandardMaterial;
  readonly ball: MeshPhysicalMaterial;
  readonly lampGlow: MeshBasicMaterial;
  readonly textures: readonly Texture[];
}

export function createMaterialLibrary(): MaterialLibrary {
  const feltMap = createFeltTexture();
  feltMap.repeat.set(3, 3);
  const woodMap = createWoodTexture('#4e2d19', 3);
  const rotorWoodMap = createWoodTexture('#6b3b1f', 5);

  return {
    felt: new MeshStandardMaterial({ color: new Color('#0e4130'), map: feltMap, roughness: 0.96, metalness: 0 }),
    walnut: new MeshPhysicalMaterial({
      color: new Color('#9a7058'),
      map: woodMap,
      roughness: 0.42,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
    }),
    walnutMatte: new MeshStandardMaterial({ color: new Color('#6e5040'), map: woodMap, roughness: 0.7 }),
    lacquer: new MeshPhysicalMaterial({
      color: new Color('#1c120d'),
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    rotorWood: new MeshPhysicalMaterial({
      color: new Color('#a07a5c'),
      map: rotorWoodMap,
      roughness: 0.52,
      clearcoat: 0.4,
      clearcoatRoughness: 0.35,
    }),
    leather: new MeshPhysicalMaterial({
      color: new Color('#2a1b14'),
      roughness: 0.58,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
      sheen: 0.4,
      sheenColor: new Color('#6b4a38'),
    }),
    brass: new MeshStandardMaterial({ color: new Color('#c9a56a'), metalness: 1, roughness: 0.26 }),
    brassSatin: new MeshStandardMaterial({ color: new Color('#a88a58'), metalness: 1, roughness: 0.45 }),
    chrome: new MeshStandardMaterial({ color: new Color('#d6d1c8'), metalness: 1, roughness: 0.16 }),
    darkMetal: new MeshStandardMaterial({ color: new Color('#22201e'), metalness: 0.85, roughness: 0.45 }),
    ball: new MeshPhysicalMaterial({
      color: new Color('#f4f0e6'),
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
    lampGlow: new MeshBasicMaterial({ color: new Color('#ffdcae') }),
    textures: [feltMap, woodMap, rotorWoodMap],
  };
}
