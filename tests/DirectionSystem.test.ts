import { describe, expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import {
  ALL_DIRECTIONS,
  ALLOWED_ROTATIONS,
  DEFAULT_ZONE_RADIUS,
  type Compass,
  type Direction,
  findZoneAt,
  getComponents,
  getDirectionOfPoint,
  getLocalPosition,
  getWorldCompass,
  getWorldPosition,
  isCorrectPlacement,
  isDiagonal,
  normalizeAngle,
  shortestAngleDelta,
  toThreeRotationY,
} from '../src/game/DirectionSystem';

const COMPASS_ORDER: Compass[] = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
];

/** 手写的期望表：每个旋转角度下 8 个方向对应的世界罗盘方向。 */
const EXPECTED: Record<number, Record<Direction, Compass>> = {
  0: {
    front: 'north', 'front-right': 'north-east', right: 'east', 'back-right': 'south-east',
    back: 'south', 'back-left': 'south-west', left: 'west', 'front-left': 'north-west',
  },
  45: {
    front: 'north-east', 'front-right': 'east', right: 'south-east', 'back-right': 'south',
    back: 'south-west', 'back-left': 'west', left: 'north-west', 'front-left': 'north',
  },
  90: {
    front: 'east', 'front-right': 'south-east', right: 'south', 'back-right': 'south-west',
    back: 'west', 'back-left': 'north-west', left: 'north', 'front-left': 'north-east',
  },
  135: {
    front: 'south-east', 'front-right': 'south', right: 'south-west', 'back-right': 'west',
    back: 'north-west', 'back-left': 'north', left: 'north-east', 'front-left': 'east',
  },
  180: {
    front: 'south', 'front-right': 'south-west', right: 'west', 'back-right': 'north-west',
    back: 'north', 'back-left': 'north-east', left: 'east', 'front-left': 'south-east',
  },
  225: {
    front: 'south-west', 'front-right': 'west', right: 'north-west', 'back-right': 'north',
    back: 'north-east', 'back-left': 'east', left: 'south-east', 'front-left': 'south',
  },
  270: {
    front: 'west', 'front-right': 'north-west', right: 'north', 'back-right': 'north-east',
    back: 'east', 'back-left': 'south-east', left: 'south', 'front-left': 'south-west',
  },
  315: {
    front: 'north-west', 'front-right': 'north', right: 'north-east', 'back-right': 'east',
    back: 'south-east', 'back-left': 'south', left: 'south-west', 'front-left': 'west',
  },
};

const COMPASS_VECTORS: Record<Compass, { x: number; z: number }> = {
  north: { x: 0, z: -1 },
  'north-east': { x: Math.SQRT1_2, z: -Math.SQRT1_2 },
  east: { x: 1, z: 0 },
  'south-east': { x: Math.SQRT1_2, z: Math.SQRT1_2 },
  south: { x: 0, z: 1 },
  'south-west': { x: -Math.SQRT1_2, z: Math.SQRT1_2 },
  west: { x: -1, z: 0 },
  'north-west': { x: -Math.SQRT1_2, z: -Math.SQRT1_2 },
};

describe('DirectionSystem 基本方向', () => {
  it('0° front = north', () => expect(getWorldCompass(0, 'front')).toBe('north'));
  it('90° front = east', () => expect(getWorldCompass(90, 'front')).toBe('east'));
  it('180° front = south', () => expect(getWorldCompass(180, 'front')).toBe('south'));
  it('270° front = west', () => expect(getWorldCompass(270, 'front')).toBe('west'));

  it('90° 时：前=右、后=左、左=上、右=下（文档示例）', () => {
    expect(getWorldCompass(90, 'front')).toBe('east');
    expect(getWorldCompass(90, 'back')).toBe('west');
    expect(getWorldCompass(90, 'left')).toBe('north');
    expect(getWorldCompass(90, 'right')).toBe('south');
  });
});

describe('DirectionSystem 全部 8 个角度 × 8 个方向', () => {
  for (const rotation of ALLOWED_ROTATIONS) {
    for (const direction of ALL_DIRECTIONS) {
      const expected = EXPECTED[rotation][direction];
      it(`${rotation}° ${direction} → ${expected}`, () => {
        expect(getWorldCompass(rotation, direction)).toBe(expected);

        const position = getWorldPosition(rotation, direction, 1);
        expect(position.x).toBeCloseTo(COMPASS_VECTORS[expected].x, 9);
        expect(position.z).toBeCloseTo(COMPASS_VECTORS[expected].z, 9);
      });
    }
  }

  it('每个角度下 8 个方向互不重复，且覆盖全部 8 个罗盘方向', () => {
    for (const rotation of ALLOWED_ROTATIONS) {
      const compasses = ALL_DIRECTIONS.map((d) => getWorldCompass(rotation, d));
      expect(new Set(compasses).size).toBe(8);
      expect([...compasses].sort()).toEqual([...COMPASS_ORDER].sort());
    }
  });
});

describe('DirectionSystem 位置与命中', () => {
  it('front-right 在自身坐标中位于右上方', () => {
    const p = getLocalPosition('front-right');
    expect(p.x).toBeCloseTo(DEFAULT_ZONE_RADIUS * Math.SQRT1_2, 9);
    expect(p.z).toBeCloseTo(-DEFAULT_ZONE_RADIUS * Math.SQRT1_2, 9);
  });

  it('位置支持动物中心偏移', () => {
    const p = getWorldPosition(90, 'front', 2, { x: 1, z: 1 });
    expect(p).toEqual({ x: 3, z: 1 });
  });

  it('getDirectionOfPoint 是 getWorldPosition 的逆运算', () => {
    for (const rotation of ALLOWED_ROTATIONS) {
      for (const direction of ALL_DIRECTIONS) {
        const p = getWorldPosition(rotation, direction);
        expect(getDirectionOfPoint(rotation, p)).toBe(direction);
      }
    }
    expect(getDirectionOfPoint(0, { x: 0, z: 0 })).toBeNull();
  });

  it('findZoneAt 只在候选方向中、命中半径内找最近的区域', () => {
    const candidates: Direction[] = ['front', 'back', 'left', 'right'];
    // 旋转 90° 后，屏幕右侧是小狗的“前”
    expect(findZoneAt(90, { x: DEFAULT_ZONE_RADIUS, z: 0.3 }, candidates)).toBe('front');
    // 旋转 90° 后，屏幕上方是小狗的“左”
    expect(findZoneAt(90, { x: 0.2, z: -DEFAULT_ZONE_RADIUS }, candidates)).toBe('left');
    // 离所有区域都太远
    expect(findZoneAt(90, { x: 10, z: 10 }, candidates)).toBeNull();
    // 斜方向不在候选中时，不会命中斜方向
    const diag = getWorldPosition(0, 'front-right');
    expect(findZoneAt(0, diag, ['front-right'])).toBe('front-right');
    expect(findZoneAt(0, diag, ['back'])).toBeNull();
  });

  it('isCorrectPlacement', () => {
    expect(isCorrectPlacement('left', 'left')).toBe(true);
    expect(isCorrectPlacement('left', 'right')).toBe(false);
    expect(isCorrectPlacement('left', null)).toBe(false);
  });
});

describe('DirectionSystem 工具函数', () => {
  it('normalizeAngle', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-45)).toBe(315);
    expect(normalizeAngle(765)).toBe(45);
  });

  it('shortestAngleDelta', () => {
    expect(shortestAngleDelta(0, 90)).toBe(90);
    expect(shortestAngleDelta(0, 270)).toBe(-90);
    expect(shortestAngleDelta(315, 45)).toBe(90);
    expect(shortestAngleDelta(0, 180)).toBe(180);
  });

  it('斜方向由两个基本方向组成', () => {
    expect(getComponents('front-left')).toEqual(['front', 'left']);
    expect(getComponents('back-right')).toEqual(['back', 'right']);
    expect(isDiagonal('front-left')).toBe(true);
    expect(isDiagonal('front')).toBe(false);
  });
});

describe('DirectionSystem 与 Three.js 场景图一致', () => {
  it('把本地位置放进旋转后的 Object3D，世界位置与 getWorldPosition 相同', () => {
    for (const rotation of ALLOWED_ROTATIONS) {
      const pivot = new Object3D();
      pivot.rotation.y = toThreeRotationY(rotation);
      pivot.updateMatrixWorld(true);
      for (const direction of ALL_DIRECTIONS) {
        const local = getLocalPosition(direction);
        const world = pivot.localToWorld(new Vector3(local.x, 0, local.z));
        const expected = getWorldPosition(rotation, direction);
        expect(world.x).toBeCloseTo(expected.x, 9);
        expect(world.z).toBeCloseTo(expected.z, 9);
      }
    }
  });
});
