/**
 * 方向系统：所有“动物自身方向 ↔ 世界方向 ↔ 地面位置”的计算都集中在这里。
 *
 * 约定（俯视地面，与屏幕一致）：
 * - 世界坐标使用 Three.js 的 x / z 平面：x 向右为正，z 向屏幕下方（朝向镜头）为正。
 * - “北 / 上” = -z，“东 / 右” = +x。
 * - 动物旋转角度 rotation 以度为单位，从“上”开始**顺时针**计算：
 *   0° 面朝上、90° 面朝右、180° 面朝下、270° 面朝左。
 *
 * 本模块不依赖 DOM，也不依赖 Three.js，可以独立单元测试。
 */

export type Direction =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'front-left'
  | 'front-right'
  | 'back-left'
  | 'back-right';

export type Compass =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

export interface GroundPoint {
  x: number;
  z: number;
}

export const ALL_DIRECTIONS: readonly Direction[] = [
  'front',
  'front-right',
  'right',
  'back-right',
  'back',
  'back-left',
  'left',
  'front-left',
];

export const ALLOWED_ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Rotation = (typeof ALLOWED_ROTATIONS)[number];

/** 各方向相对于动物“前方”的顺时针偏移角度。 */
const LOCAL_OFFSETS: Record<Direction, number> = {
  front: 0,
  'front-right': 45,
  right: 90,
  'back-right': 135,
  back: 180,
  'back-left': 225,
  left: 270,
  'front-left': 315,
};

const COMPASS_BY_HEADING: readonly Compass[] = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
];

const COMPONENTS: Record<Direction, readonly Direction[]> = {
  front: ['front'],
  back: ['back'],
  left: ['left'],
  right: ['right'],
  'front-left': ['front', 'left'],
  'front-right': ['front', 'right'],
  'back-left': ['back', 'left'],
  'back-right': ['back', 'right'],
};

/** 默认 Drop Zone 离动物中心的距离（世界单位）。 */
export const DEFAULT_ZONE_RADIUS = 3;

const EPSILON = 1e-9;

function cleanZero(value: number): number {
  return Math.abs(value) < EPSILON ? 0 : value;
}

/** 把任意角度归一化到 [0, 360)。 */
export function normalizeAngle(degrees: number): number {
  const result = ((degrees % 360) + 360) % 360;
  return Math.abs(result - 360) < EPSILON ? 0 : cleanZero(result);
}

/** 从 from 转到 to 的最短角度差，范围 (-180, 180]。 */
export function shortestAngleDelta(from: number, to: number): number {
  const delta = normalizeAngle(to - from);
  return delta > 180 ? delta - 360 : delta;
}

export function isAllowedRotation(degrees: number): degrees is Rotation {
  return (ALLOWED_ROTATIONS as readonly number[]).includes(degrees);
}

export function isDiagonal(direction: Direction): boolean {
  return COMPONENTS[direction].length === 2;
}

/** 斜方向由哪两个基本方向组成，例如 front-left → [front, left]。 */
export function getComponents(direction: Direction): readonly Direction[] {
  return COMPONENTS[direction];
}

/** 方向相对动物前方的顺时针偏移。 */
export function getLocalOffset(direction: Direction): number {
  return LOCAL_OFFSETS[direction];
}

/** 动物旋转 rotation 后，某个自身方向在世界中的朝向角（顺时针，0 = 上）。 */
export function getWorldHeading(rotation: number, direction: Direction): number {
  return normalizeAngle(rotation + LOCAL_OFFSETS[direction]);
}

/** 顺时针朝向角 → 地面单位向量。0° = (0, -1)，90° = (1, 0)。 */
export function headingToVector(heading: number): GroundPoint {
  const radians = (heading * Math.PI) / 180;
  return { x: cleanZero(Math.sin(radians)), z: cleanZero(-Math.cos(radians)) };
}

/** 动物旋转 rotation 后，某个自身方向对应的世界单位向量。 */
export function getWorldVector(rotation: number, direction: Direction): GroundPoint {
  return headingToVector(getWorldHeading(rotation, direction));
}

/** 世界朝向角 → 罗盘方向（四舍五入到最近的 45°）。 */
export function headingToCompass(heading: number): Compass {
  const index = Math.round(normalizeAngle(heading) / 45) % 8;
  return COMPASS_BY_HEADING[index];
}

/** 动物旋转 rotation 后，某个自身方向指向世界的哪个罗盘方向。 */
export function getWorldCompass(rotation: number, direction: Direction): Compass {
  return headingToCompass(getWorldHeading(rotation, direction));
}

/** 方向在动物自身坐标系（未旋转）中的位置。 */
export function getLocalPosition(direction: Direction, radius = DEFAULT_ZONE_RADIUS): GroundPoint {
  return getWorldPosition(0, direction, radius);
}

/** 动物位于 center 且旋转 rotation 时，某个方向区域在世界中的位置。 */
export function getWorldPosition(
  rotation: number,
  direction: Direction,
  radius = DEFAULT_ZONE_RADIUS,
  center: GroundPoint = { x: 0, z: 0 },
): GroundPoint {
  const vector = getWorldVector(rotation, direction);
  return {
    x: cleanZero(center.x + vector.x * radius),
    z: cleanZero(center.z + vector.z * radius),
  };
}

/** 世界里的某个点，相对于旋转 rotation 的动物，属于它的哪个自身方向。 */
export function getDirectionOfPoint(
  rotation: number,
  point: GroundPoint,
  center: GroundPoint = { x: 0, z: 0 },
): Direction | null {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  if (Math.hypot(dx, dz) < EPSILON) return null;
  const worldHeading = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const localHeading = normalizeAngle(worldHeading - rotation);
  const index = Math.round(localHeading / 45) % 8;
  return ALL_DIRECTIONS[index];
}

export interface HitTestOptions {
  radius?: number;
  hitRadius?: number;
  center?: GroundPoint;
}

/**
 * Drop Zone 命中检测：在候选方向中找到离 point 最近、且在 hitRadius 以内的区域。
 */
export function findZoneAt(
  rotation: number,
  point: GroundPoint,
  candidates: readonly Direction[],
  { radius = DEFAULT_ZONE_RADIUS, hitRadius = 1.5, center = { x: 0, z: 0 } }: HitTestOptions = {},
): Direction | null {
  let best: Direction | null = null;
  let bestDistance = Infinity;
  for (const direction of candidates) {
    const zone = getWorldPosition(rotation, direction, radius, center);
    const distance = Math.hypot(point.x - zone.x, point.z - zone.z);
    if (distance <= hitRadius && distance < bestDistance) {
      best = direction;
      bestDistance = distance;
    }
  }
  return best;
}

/** 把顺时针角度转换成 Three.js 绕 y 轴的旋转弧度（Three.js 以逆时针为正）。 */
export function toThreeRotationY(rotation: number): number {
  return cleanZero((-rotation * Math.PI) / 180);
}

/** 判断：把 card 放进 zone 是否正确。 */
export function isCorrectPlacement(card: Direction, zone: Direction | null): boolean {
  return zone !== null && card === zone;
}
