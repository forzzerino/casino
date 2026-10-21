/**
 * Procedural European roulette wheel. Stator (cabinet, ball track, bowl,
 * deflectors) is static; the rotor group spins. Every surface radius/height
 * comes from wheelDimensions so the planned ball path matches the geometry.
 *
 * A GLB model could replace this class later — the rest of the scene only uses
 * `group`, `setRotorAngle`, `setBall` and `ballWorldPosition`.
 */
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
  type Texture,
  type Vector3,
} from 'three';
import { POCKET_COUNT, POCKET_STEP, pocketLocalAngle } from '../../game/roulette/wheel';
import { BALL_RADIUS, WHEEL_DIMENSIONS as D, statorSurfaceY } from '../../game/roulette/wheelDimensions';
import type { MaterialLibrary } from '../materials';
import { WORLD } from '../sceneLayout';
import { ROTOR_TEXTURE_RADIUS, createRotorTexture } from '../textures/wheelTexture';

const LATHE_SEGMENTS = 148;

type Profile = readonly (readonly [number, number])[];

function latheGeometry(profile: Profile): LatheGeometry {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    LATHE_SEGMENTS,
  );
}

/** Top-down UV projection so the painted rotor texture lines up with pocket angles. */
function applyPlanarUV(geometry: BufferGeometry, radius: number): void {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, 0.5 + position.getX(i) / (2 * radius), 0.5 - position.getZ(i) / (2 * radius));
  }
  uv.needsUpdate = true;
}

export class RouletteWheel {
  readonly group = new Group();
  readonly rotor = new Group();
  readonly ball: Mesh;
  private readonly geometries: BufferGeometry[] = [];
  private readonly ownedMaterials: Material[] = [];
  private readonly ownedTextures: Texture[] = [];

  constructor(private readonly materials: MaterialLibrary) {
    this.group.name = 'roulette-wheel';
    this.group.position.copy(WORLD.wheelCenter);
    this.buildStator();
    this.buildRotor();

    const ballGeometry = this.track(new SphereGeometry(BALL_RADIUS, 28, 18));
    this.ball = new Mesh(ballGeometry, materials.ball);
    this.ball.castShadow = true;
    this.group.add(this.ball);
  }

  private track<T extends BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private addMesh(parent: Object3D, geometry: BufferGeometry, material: Material, receiveOnly = false): Mesh {
    const mesh = new Mesh(this.track(geometry), material);
    mesh.castShadow = !receiveOnly;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildStator(): void {
    const m = this.materials;
    const outer = D.cabinetRadius;

    // Dark base disc so no felt shows through gaps.
    const base = new CircleGeometry(outer, 64);
    base.rotateX(-Math.PI / 2);
    base.translate(0, 0.002, 0);
    this.addMesh(this.group, base, m.lacquer, true);

    this.addMesh(this.group, latheGeometry([[outer, 0], [outer, 0.064]]), m.walnut);
    this.addMesh(
      this.group,
      latheGeometry([
        [outer, 0.064],
        [0.447, 0.077],
        [0.438, 0.083],
        [D.rimTopRadius, D.rimTopY],
        [0.418, 0.082],
        [D.rimInnerRadius + 0.002, 0.078],
      ]),
      m.walnut,
    );
    // Ball track: inner wall and running surface in polished wood.
    this.addMesh(
      this.group,
      latheGeometry([
        [D.rimInnerRadius + 0.002, 0.078],
        [0.407, 0.068],
        [D.trackWallRadius, 0.057],
        [0.398, 0.051],
        [0.366, 0.044],
      ]),
      m.walnut,
    );
    // Lower bowl down to the rotor gap, lacquered dark.
    this.addMesh(
      this.group,
      latheGeometry([
        [0.366, 0.044],
        [D.deflectorRadius, statorSurfaceY(D.deflectorRadius)],
        [D.statorInnerRadius, D.statorInnerY],
        [D.statorInnerRadius - 0.001, 0.008],
      ]),
      m.lacquer,
      true,
    );

    // Brass diamond deflectors, alternating orientation.
    const diamond = this.track(new OctahedronGeometry(0.011, 0));
    for (let k = 0; k < D.deflectorCount; k++) {
      const angle = (k / D.deflectorCount) * Math.PI * 2 + Math.PI / D.deflectorCount;
      const mesh = new Mesh(diamond, m.brass);
      mesh.position.set(
        Math.cos(angle) * D.deflectorRadius,
        statorSurfaceY(D.deflectorRadius) + 0.0035,
        -Math.sin(angle) * D.deflectorRadius,
      );
      mesh.rotation.y = angle + (k % 2 === 0 ? 0 : Math.PI / 2);
      mesh.scale.set(1.25, 0.32, 0.55);
      mesh.castShadow = true;
      this.group.add(mesh);
    }
  }

  private buildRotor(): void {
    const m = this.materials;
    this.rotor.name = 'rotor';
    this.group.add(this.rotor);

    const rotorTexture = createRotorTexture();
    this.ownedTextures.push(rotorTexture);
    const painted = new MeshStandardMaterial({ map: rotorTexture, roughness: 0.34, metalness: 0.05 });
    this.ownedMaterials.push(painted);

    this.addMesh(this.rotor, latheGeometry([[D.rotorRadius, 0.006], [D.rotorRadius, D.rotorRimY]]), m.brassSatin);

    const ring = latheGeometry([
      [D.rotorRadius, D.rotorRimY],
      [D.numberRingOuter, D.rotorRimY + 0.0005],
      [D.numberRingInner, D.numberRingInnerY],
      [D.pocketOuterRadius, D.numberRingInnerY - 0.0005],
      [D.pocketOuterRadius, D.pocketFloorY],
    ]);
    applyPlanarUV(ring, ROTOR_TEXTURE_RADIUS);
    this.addMesh(this.rotor, ring, painted, true);

    const floor = latheGeometry([
      [D.pocketOuterRadius, D.pocketFloorY],
      [0.194, D.pocketFloorY - 0.0008],
      [D.pocketInnerRadius, D.pocketFloorY],
    ]);
    applyPlanarUV(floor, ROTOR_TEXTURE_RADIUS);
    this.addMesh(this.rotor, floor, painted, true);

    this.addMesh(
      this.rotor,
      latheGeometry([
        [D.pocketInnerRadius, D.pocketFloorY],
        [D.pocketInnerRadius, D.coneBaseY - 0.002],
      ]),
      m.chrome,
    );
    this.addMesh(
      this.rotor,
      latheGeometry([
        [D.pocketInnerRadius, D.coneBaseY - 0.002],
        [0.156, D.coneBaseY + 0.002],
        [0.12, 0.036],
        [0.08, 0.05],
        [0.045, 0.06],
        [D.coneTopRadius, D.coneTopY],
        [0.001, D.coneTopY + 0.001],
      ]),
      m.rotorWood,
    );

    // Frets between pockets — one instanced mesh.
    const fretLength = D.pocketOuterRadius - D.pocketInnerRadius;
    const frets = new InstancedMesh(
      this.track(new BoxGeometry(fretLength, D.fretHeight, D.fretThickness)),
      m.chrome,
      POCKET_COUNT,
    );
    const dummy = new Object3D();
    const fretRadius = (D.pocketOuterRadius + D.pocketInnerRadius) / 2;
    for (let i = 0; i < POCKET_COUNT; i++) {
      const angle = pocketLocalAngle(i) + POCKET_STEP / 2;
      dummy.position.set(Math.cos(angle) * fretRadius, D.pocketFloorY + D.fretHeight / 2, -Math.sin(angle) * fretRadius);
      dummy.rotation.set(0, angle, 0);
      dummy.updateMatrix();
      frets.setMatrixAt(i, dummy.matrix);
    }
    frets.castShadow = true;
    frets.receiveShadow = true;
    this.rotor.add(frets);

    for (const [radius, y] of [
      [D.pocketOuterRadius, D.numberRingInnerY],
      [D.pocketInnerRadius, D.coneBaseY - 0.002],
    ] as const) {
      const torus = this.track(new TorusGeometry(radius, 0.0016, 8, LATHE_SEGMENTS));
      torus.rotateX(Math.PI / 2);
      const mesh = this.addMesh(this.rotor, torus, m.chrome);
      mesh.position.y = y;
    }

    this.buildTurret();
  }

  private buildTurret(): void {
    const m = this.materials;
    const turret = new Group();
    turret.position.y = D.coneTopY;
    this.rotor.add(turret);

    const add = (geometry: BufferGeometry, y: number, rotation?: Matrix4): Mesh => {
      if (rotation) geometry.applyMatrix4(rotation);
      const mesh = this.addMesh(turret, geometry, m.brass);
      mesh.position.y = y;
      return mesh;
    };

    add(new CylinderGeometry(0.03, 0.036, 0.008, 40), 0.004);
    add(new CylinderGeometry(0.007, 0.01, 0.05, 20), 0.033);
    const armLength = 0.13;
    const horizontal = new Matrix4().makeRotationZ(Math.PI / 2);
    const arm1 = add(new CylinderGeometry(0.0034, 0.0034, armLength, 12), 0.05, horizontal);
    const arm2 = add(new CylinderGeometry(0.0034, 0.0034, armLength, 12), 0.05, horizontal);
    arm2.rotation.y = Math.PI / 2;
    arm1.rotation.y = 0;
    const knob = this.track(new SphereGeometry(0.0072, 16, 12));
    for (let k = 0; k < 4; k++) {
      const angle = (k * Math.PI) / 2;
      const mesh = new Mesh(knob, m.brass);
      mesh.position.set(Math.cos(angle) * (armLength / 2), 0.05, Math.sin(angle) * (armLength / 2));
      mesh.castShadow = true;
      turret.add(mesh);
    }
    add(new SphereGeometry(0.011, 20, 14), 0.064);
    add(new CylinderGeometry(0.004, 0.006, 0.012, 12), 0.056);
  }

  setRotorAngle(angle: number): void {
    this.rotor.rotation.y = angle;
  }

  /** Ball position in the stator frame (angle in radians, radius/height in metres). */
  setBall(angle: number, radius: number, y: number, scale = 1): void {
    this.ball.position.set(Math.cos(angle) * radius, y, -Math.sin(angle) * radius);
    this.ball.scale.setScalar(scale);
    this.ball.visible = scale > 0.001;
  }

  ballWorldPosition(out: Vector3): Vector3 {
    return this.ball.getWorldPosition(out);
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.ownedMaterials.forEach((mat) => mat.dispose());
    this.ownedTextures.forEach((t) => t.dispose());
  }
}
