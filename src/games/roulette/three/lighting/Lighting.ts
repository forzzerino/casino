import { Color, Group, HemisphereLight, Object3D, PointLight, SpotLight } from 'three';
import { LAMP } from '../objects/Lamp';
import { WORLD } from '../sceneLayout';

/**
 * Warm, restrained lighting: two shadow-casting spots from the lamp (layout and
 * wheel), a dim hemisphere fill and two practical lights for the room.
 * Few lights, few shadow casters — the mood comes from contrast.
 */
export class Lighting {
  readonly group = new Group();
  readonly key: SpotLight;
  readonly wheelSpot: SpotLight;

  constructor() {
    this.group.name = 'lighting';
    const lampY = LAMP.y - LAMP.height / 2 - 0.02;

    this.key = new SpotLight(new Color('#ffdab0'), 30, 0, 0.78, 0.85, 2);
    this.key.position.set(0.32, lampY, 0.1);
    this.key.target = this.targetAt(0.26, 0, 0.02);
    this.configureShadow(this.key, 2048, 3.2);

    this.wheelSpot = new SpotLight(new Color('#ffdcb2'), 22, 0, 0.44, 0.75, 2);
    this.wheelSpot.position.set(WORLD.wheelCenter.x - 0.02, lampY, WORLD.wheelCenter.z + 0.06);
    this.wheelSpot.target = this.targetAt(WORLD.wheelCenter.x, 0, WORLD.wheelCenter.z);
    this.configureShadow(this.wheelSpot, 1024, 3);

    const fill = new HemisphereLight(new Color('#ffe6c6'), new Color('#100b08'), 0.32);

    // Practicals warming the walls behind the table.
    const backLeft = new PointLight(new Color('#ff9c55'), 9, 9, 2);
    backLeft.position.set(-4.2, 1.6, -5.2);
    const backRight = new PointLight(new Color('#ffad6a'), 7, 9, 2);
    backRight.position.set(4.6, 1.5, -4.4);

    this.group.add(this.key, this.wheelSpot, fill, backLeft, backRight);
  }

  private targetAt(x: number, y: number, z: number): Object3D {
    const target = new Object3D();
    target.position.set(x, y, z);
    this.group.add(target);
    return target;
  }

  private configureShadow(light: SpotLight, size: number, far: number): void {
    light.castShadow = true;
    light.shadow.mapSize.set(size, size);
    light.shadow.camera.near = 0.6;
    light.shadow.camera.far = far;
    light.shadow.bias = -0.00015;
    light.shadow.normalBias = 0.012;
    light.shadow.radius = 3;
  }

  dispose(): void {
    this.key.shadow.map?.dispose();
    this.wheelSpot.shadow.map?.dispose();
  }
}
