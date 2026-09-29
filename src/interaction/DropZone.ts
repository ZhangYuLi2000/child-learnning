import { CircleGeometry, Mesh, MeshBasicMaterial, RingGeometry, Group, Vector3 } from 'three';
import { DEFAULT_ZONE_RADIUS, getLocalPosition, type Direction } from '../game/DirectionSystem';

export type DropZoneState = 'hidden' | 'idle' | 'hover' | 'placed' | 'given';

const ZONE_SIZE = 0.8;
const WRONG_FLASH = 0.6;

const discGeometry = new CircleGeometry(ZONE_SIZE, 40);
const ringGeometry = new RingGeometry(ZONE_SIZE - 0.08, ZONE_SIZE, 40);

const COLORS: Record<Exclude<DropZoneState, 'hidden'>, { disc: string; opacity: number; ring: string }> = {
  idle: { disc: '#ffffff', opacity: 0.45, ring: '#ffffff' },
  hover: { disc: '#fff3a3', opacity: 0.85, ring: '#ffb400' },
  placed: { disc: '#b9f6ca', opacity: 0.85, ring: '#2ecc71' },
  given: { disc: '#e3f2fd', opacity: 0.7, ring: '#90caf9' },
};

/**
 * 小狗周围的一个方位区域。挂在 Animal.directionContainer 下，
 * 本地位置由 DirectionSystem 计算，因此自动跟随小狗旋转。
 */
export class DropZone {
  readonly direction: Direction;
  readonly object = new Group();
  private readonly discMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false });
  private readonly ringMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false });
  private stateValue: DropZoneState = 'hidden';
  private wrongTime = 0;
  private readonly worldPosition = new Vector3();

  constructor(direction: Direction, radius = DEFAULT_ZONE_RADIUS) {
    this.direction = direction;
    const local = getLocalPosition(direction, radius);
    this.object.name = `${direction}-zone`;
    this.object.position.set(local.x, 0.02, local.z);
    const disc = new Mesh(discGeometry, this.discMaterial);
    const ring = new Mesh(ringGeometry, this.ringMaterial);
    disc.rotation.x = -Math.PI / 2;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    this.object.add(disc, ring);
    this.setState('hidden');
  }

  get state(): DropZoneState {
    return this.stateValue;
  }

  /** 可以接收卡片（显示中且尚未放置）。 */
  get isOpen(): boolean {
    return this.stateValue === 'idle' || this.stateValue === 'hover';
  }

  get isFilled(): boolean {
    return this.stateValue === 'placed' || this.stateValue === 'given';
  }

  setState(state: DropZoneState): void {
    this.stateValue = state;
    this.object.visible = state !== 'hidden';
    if (state === 'hidden') return;
    const colors = COLORS[state];
    this.discMaterial.color.set(colors.disc);
    this.discMaterial.opacity = colors.opacity;
    this.ringMaterial.color.set(colors.ring);
    this.ringMaterial.opacity = 1;
    this.object.scale.setScalar(state === 'hover' ? 1.12 : 1);
  }

  /** 放错时轻轻闪一下橙色。 */
  flashWrong(): void {
    this.wrongTime = WRONG_FLASH;
  }

  getWorldPosition(): Vector3 {
    return this.object.getWorldPosition(this.worldPosition);
  }

  update(dt: number): void {
    if (this.wrongTime <= 0) return;
    this.wrongTime = Math.max(0, this.wrongTime - dt);
    if (this.wrongTime > 0) {
      const pulse = Math.sin((this.wrongTime / WRONG_FLASH) * Math.PI * 3) > 0;
      this.ringMaterial.color.set(pulse ? '#ff9f43' : COLORS.idle.ring);
    } else {
      this.setState(this.stateValue);
    }
  }
}
