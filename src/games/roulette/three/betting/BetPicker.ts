import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import { resolveSpotAt } from '../../game/betting/layout';
import type { BetSpot } from '../../types/game';
import type { LayoutSurface } from './LayoutSurface';

export interface BetPickerHandlers {
  hover(spot: BetSpot | null, clientX: number, clientY: number): void;
  select(spot: BetSpot): void;
  /** Double-click shortcut: select and place in one go. */
  activate(spot: BetSpot): void;
}

/**
 * Raycasts pointer positions onto the felt plane and resolves them to betting
 * spots. Selection only — chips are placed through the BET action.
 */
export class BetPicker {
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly felt = new Plane(new Vector3(0, 1, 0), 0);
  private readonly hit = new Vector3();
  private enabled = false;
  private hovered: BetSpot | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly camera: Camera,
    private readonly layout: LayoutSurface,
    private readonly handlers: BetPickerHandlers,
  ) {
    element.addEventListener('pointermove', this.onMove);
    element.addEventListener('pointerleave', this.onLeave);
    element.addEventListener('click', this.onClick);
    element.addEventListener('dblclick', this.onDoubleClick);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.setHovered(null, 0, 0);
  }

  private pick(event: MouseEvent): BetSpot | null {
    const rect = this.element.getBoundingClientRect();
    this.ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.felt, this.hit)) return null;
    return resolveSpotAt(this.layout.worldToLayout(this.hit));
  }

  private setHovered(spot: BetSpot | null, x: number, y: number): void {
    const changed = spot?.key !== this.hovered?.key;
    this.hovered = spot;
    this.element.style.cursor = spot ? 'pointer' : 'default';
    if (changed || spot) this.handlers.hover(spot, x, y);
  }

  private readonly onMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    this.setHovered(this.pick(event), event.clientX, event.clientY);
  };

  private readonly onLeave = (): void => {
    if (this.enabled) this.setHovered(null, 0, 0);
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.enabled) return;
    const spot = this.pick(event);
    if (spot) this.handlers.select(spot);
  };

  private readonly onDoubleClick = (event: MouseEvent): void => {
    if (!this.enabled) return;
    const spot = this.pick(event);
    if (spot) this.handlers.activate(spot);
  };

  dispose(): void {
    this.element.removeEventListener('pointermove', this.onMove);
    this.element.removeEventListener('pointerleave', this.onLeave);
    this.element.removeEventListener('click', this.onClick);
    this.element.removeEventListener('dblclick', this.onDoubleClick);
  }
}
