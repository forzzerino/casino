/**
 * The room around the hero table: carpet, panelled walls, a dark ceiling with
 * distant downlights, silhouetted gaming tables, sconces and a backlit bar. It
 * is deliberately low-detail and lit mostly by emissive surfaces and additive
 * "light pools" rather than real lights.
 */
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import type { MaterialLibrary } from '../materials';
import { WORLD } from '../sceneLayout';
import { createCarpetTexture, createWallTexture } from '../textures/surfaceTextures';

const ROOM_RADIUS = 9.5;
const ROOM_HEIGHT = 3.7;

export class CasinoEnvironment {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];
  private readonly textures: Texture[] = [];

  constructor(
    private readonly lib: MaterialLibrary,
    private readonly glow: Texture,
  ) {
    this.group.name = 'environment';
    this.buildShell();
    this.buildDownlights();
    this.buildBackgroundTables();
    this.buildSconces();
    this.buildColumns();
    this.buildBar();
  }

  private geo<T extends BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private mat<T extends Material>(material: T): T {
    this.materials.push(material);
    return material;
  }

  private add(geometry: BufferGeometry, material: Material, x: number, y: number, z: number): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }

  private lightPool(width: number, depth: number, opacity: number, color = '#ffc98f'): Mesh {
    const mesh = new Mesh(
      this.geo(new PlaneGeometry(width, depth)),
      this.mat(
        new MeshBasicMaterial({
          map: this.glow,
          color: new Color(color),
          transparent: true,
          opacity,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private buildShell(): void {
    const carpet = createCarpetTexture();
    carpet.repeat.set(16, 16);
    const wall = createWallTexture();
    wall.repeat.set(30, 1.4);
    this.textures.push(carpet, wall);

    const floor = this.add(
      this.geo(new PlaneGeometry(ROOM_RADIUS * 2.4, ROOM_RADIUS * 2.4)),
      this.mat(new MeshStandardMaterial({ map: carpet, roughness: 0.95, color: new Color('#9a8a86') })),
      0,
      WORLD.floorY,
      0,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    this.add(
      this.geo(new CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, ROOM_HEIGHT, 72, 1, true)),
      this.mat(new MeshStandardMaterial({ map: wall, side: BackSide, roughness: 0.7, color: new Color('#a08c7a') })),
      0,
      WORLD.floorY + ROOM_HEIGHT / 2,
      0,
    );

    const ceiling = this.add(
      this.geo(new CircleGeometry(ROOM_RADIUS, 72)),
      this.mat(new MeshStandardMaterial({ color: new Color('#0d0b0a'), roughness: 0.9 })),
      0,
      WORLD.floorY + ROOM_HEIGHT,
      0,
    );
    ceiling.rotation.x = Math.PI / 2;

    // Pool of light on the carpet beneath our table.
    const pool = this.lightPool(5.2, 3.6, 0.1);
    pool.position.set(-0.2, WORLD.floorY + 0.004, 0);
    this.group.add(pool);
  }

  private buildDownlights(): void {
    const geometry = this.geo(new CircleGeometry(0.055, 18));
    geometry.rotateX(Math.PI / 2);
    const material = this.mat(new MeshBasicMaterial({ color: new Color('#ffd7a3') }));
    const positions: [number, number][] = [];
    for (let x = -7.5; x <= 7.5; x += 1.5) {
      for (let z = -7.5; z <= 7.5; z += 1.5) {
        if (Math.hypot(x, z) > ROOM_RADIUS - 0.8) continue;
        if (Math.abs(x) < 2.2 && Math.abs(z) < 1.6) continue;
        positions.push([x + (z % 3 === 0 ? 0.75 : 0), z]);
      }
    }
    const mesh = new InstancedMesh(geometry, material, positions.length);
    const dummy = new Object3D();
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, WORLD.floorY + ROOM_HEIGHT - 0.01, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(mesh);
  }

  private buildBackgroundTables(): void {
    const body = this.geo(new BoxGeometry(1.9, 0.78, 1.0));
    const top = this.geo(new BoxGeometry(2.05, 0.05, 1.15));
    const shade = this.geo(new BoxGeometry(1.5, 0.08, 0.32));
    const diffuser = this.geo(new PlaneGeometry(1.42, 0.26));
    diffuser.rotateX(Math.PI / 2);
    const bodyMat = this.mat(new MeshStandardMaterial({ color: new Color('#1d130d'), roughness: 0.6 }));
    const feltMat = this.mat(new MeshStandardMaterial({ color: new Color('#0c2d22'), roughness: 0.95 }));

    const placements: [number, number, number][] = [
      [-4.7, -3.9, 0.35],
      [4.5, -3.3, -0.45],
      [0.6, -6.9, 0.05],
      [-6.4, 1.8, 1.4],
      [6.2, 2.4, -1.3],
    ];
    for (const [x, z, rotation] of placements) {
      const table = new Group();
      table.position.set(x, WORLD.floorY, z);
      table.rotation.y = rotation;
      const b = new Mesh(body, bodyMat);
      b.position.y = 0.39;
      const t = new Mesh(top, feltMat);
      t.position.y = 0.8;
      const s = new Mesh(shade, this.lib.darkMetal);
      s.position.y = 2.45;
      const d = new Mesh(diffuser, this.lib.lampGlow);
      d.position.y = 2.405;
      const pool = this.lightPool(2.3, 1.4, 0.32);
      pool.position.y = 0.83;
      const floorPool = this.lightPool(3.6, 2.6, 0.08);
      floorPool.position.y = 0.006;
      table.add(b, t, s, d, pool, floorPool);
      this.group.add(table);
    }
  }

  private buildSconces(): void {
    const plate = this.geo(new BoxGeometry(0.16, 0.34, 0.04));
    const shade = this.geo(new CylinderGeometry(0.085, 0.11, 0.2, 20, 1, true));
    const shadeMat = this.mat(
      new MeshStandardMaterial({
        color: new Color('#3b2a1c'),
        emissive: new Color('#ffb46a'),
        emissiveIntensity: 0.9,
        side: DoubleSide,
      }),
    );
    const haloMat = this.mat(
      new SpriteMaterial({
        map: this.glow,
        color: 0xffbf80,
        transparent: true,
        opacity: 0.42,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const wash = this.geo(new PlaneGeometry(1.4, 2.4));
    const washMat = this.mat(
      new MeshBasicMaterial({
        map: this.glow,
        color: new Color('#ff9f55'),
        transparent: true,
        opacity: 0.2,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );

    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.11;
      const r = ROOM_RADIUS - 0.05;
      const sconce = new Group();
      sconce.position.set(Math.cos(angle) * r, WORLD.floorY + 2.05, Math.sin(angle) * r);
      sconce.lookAt(0, sconce.position.y, 0);
      const p = new Mesh(plate, this.lib.brassSatin);
      const s = new Mesh(shade, shadeMat);
      s.position.set(0, 0.06, 0.12);
      const halo = new Sprite(haloMat);
      halo.position.set(0, 0.06, 0.16);
      halo.scale.set(0.9, 0.9, 1);
      const w = new Mesh(wash, washMat);
      w.position.set(0, 0.1, 0.025);
      sconce.add(p, s, halo, w);
      this.group.add(sconce);
    }
  }

  private buildColumns(): void {
    const shaft = this.geo(new CylinderGeometry(0.26, 0.26, ROOM_HEIGHT, 32));
    const band = this.geo(new TorusGeometry(0.27, 0.018, 10, 40));
    band.rotateX(Math.PI / 2);
    const marble = this.mat(
      new MeshStandardMaterial({ color: new Color('#1b1715'), roughness: 0.32, metalness: 0.1 }),
    );
    const spots: [number, number][] = [
      [-3.6, -2.5],
      [3.8, -2.2],
      [-3.9, 3.2],
      [3.7, 3.4],
    ];
    for (const [x, z] of spots) {
      this.add(shaft, marble, x, WORLD.floorY + ROOM_HEIGHT / 2, z).castShadow = false;
      for (const y of [0.25, 2.6, ROOM_HEIGHT - 0.25]) this.add(band, this.lib.brass, x, WORLD.floorY + y, z);
    }
  }

  private buildBar(): void {
    const counter = this.geo(new BoxGeometry(5.6, 1.05, 0.7));
    const strip = this.geo(new BoxGeometry(5.4, 0.025, 0.03));
    const shelf = this.geo(new BoxGeometry(5.0, 0.03, 0.25));
    const backPanel = this.geo(new PlaneGeometry(5.6, 1.6));
    const counterMat = this.mat(new MeshStandardMaterial({ color: new Color('#20150e'), roughness: 0.45 }));
    const stripMat = this.mat(new MeshBasicMaterial({ color: new Color('#ffb76e') }));
    const panelMat = this.mat(
      new MeshBasicMaterial({
        map: this.glow,
        color: new Color('#a8642c'),
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );

    const bar = new Group();
    bar.position.set(-0.4, WORLD.floorY, -ROOM_RADIUS + 0.9);
    const c = new Mesh(counter, counterMat);
    c.position.y = 0.525;
    const s1 = new Mesh(strip, stripMat);
    s1.position.set(0, 1.04, 0.36);
    bar.add(c, s1);
    for (const y of [1.55, 1.95, 2.35]) {
      const sh = new Mesh(shelf, this.lib.darkMetal);
      sh.position.set(0, y, -0.45);
      const st = new Mesh(strip, stripMat);
      st.position.set(0, y - 0.03, -0.33);
      bar.add(sh, st);
    }
    const panel = new Mesh(backPanel, panelMat);
    panel.position.set(0, 1.95, -0.56);
    bar.add(panel);
    this.group.add(bar);
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
