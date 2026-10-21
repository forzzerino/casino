import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  type BufferGeometry,
  type Texture,
} from 'three';
import type { MaterialLibrary } from '../materials';

export const LAMP = {
  x: -0.22,
  z: -0.02,
  y: 1.78,
  length: 2.3,
  width: 0.36,
  height: 0.09,
} as const;

/** Long bronze billiard-style shade with a glowing diffuser hung over the table. */
export class Lamp {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly haloMaterial: SpriteMaterial;

  constructor(materials: MaterialLibrary, glow: Texture) {
    this.group.name = 'lamp';
    this.group.position.set(LAMP.x, LAMP.y, LAMP.z);

    const track = <T extends BufferGeometry>(g: T): T => {
      this.geometries.push(g);
      return g;
    };

    const shade = new Mesh(track(new BoxGeometry(LAMP.length, LAMP.height, LAMP.width)), materials.darkMetal);
    shade.castShadow = false;
    this.group.add(shade);

    const trim = new Mesh(track(new BoxGeometry(LAMP.length + 0.01, 0.012, LAMP.width + 0.01)), materials.brass);
    trim.position.y = -LAMP.height / 2;
    this.group.add(trim);

    const diffuser = new Mesh(track(new PlaneGeometry(LAMP.length - 0.06, LAMP.width - 0.06)), materials.lampGlow);
    diffuser.rotation.x = Math.PI / 2;
    diffuser.position.y = -LAMP.height / 2 - 0.007;
    this.group.add(diffuser);

    const rod = track(new CylinderGeometry(0.006, 0.006, 2.2, 8));
    for (const x of [-LAMP.length * 0.36, LAMP.length * 0.36]) {
      const mesh = new Mesh(rod, materials.brassSatin);
      mesh.position.set(x, 1.1, 0);
      this.group.add(mesh);
    }

    // Soft halo so the diffuser reads as a light source without bloom.
    this.haloMaterial = new SpriteMaterial({
      map: glow,
      color: 0xffcf96,
      transparent: true,
      opacity: 0.16,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    for (const x of [-0.7, 0, 0.7]) {
      const halo = new Sprite(this.haloMaterial);
      halo.position.set(x, -LAMP.height / 2 - 0.05, 0);
      halo.scale.set(1.3, 0.55, 1);
      this.group.add(halo);
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.haloMaterial.dispose();
  }
}
