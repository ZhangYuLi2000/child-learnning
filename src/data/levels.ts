import type { Direction, Rotation } from '../game/DirectionSystem';

export type RotationPlan =
  | { mode: 'fixed'; angles: readonly Rotation[] }
  | { mode: 'random'; choices: readonly Rotation[]; rounds: number };

export interface LevelConfig {
  id: number;
  title: string;
  /** 本关需要孩子点选放置的方向卡片。 */
  directions: readonly Direction[];
  /** 本关预先摆好、作为提示的方向（不需要放置）。 */
  givenDirections?: readonly Direction[];
  rotation: RotationPlan;
  difficulty: number;
}

const BASIC: readonly Direction[] = ['front', 'back', 'left', 'right'];
const DIAGONAL: readonly Direction[] = ['front-left', 'front-right', 'back-left', 'back-right'];
const RIGHT_ANGLES: readonly Rotation[] = [0, 90, 180, 270];
const ALL_ANGLES: readonly Rotation[] = [0, 45, 90, 135, 180, 225, 270, 315];

export const levels: readonly LevelConfig[] = [
  {
    id: 1,
    title: '前和后',
    directions: ['front', 'back'],
    rotation: { mode: 'fixed', angles: [0, 180] },
    difficulty: 1,
  },
  {
    id: 2,
    title: '左和右',
    directions: BASIC,
    rotation: { mode: 'fixed', angles: [0, 90] },
    difficulty: 2,
  },
  {
    id: 3,
    title: '小狗转圈圈',
    directions: BASIC,
    rotation: { mode: 'random', choices: RIGHT_ANGLES, rounds: 3 },
    difficulty: 3,
  },
  {
    id: 4,
    title: '斜着的方向',
    directions: DIAGONAL,
    givenDirections: BASIC,
    rotation: { mode: 'random', choices: RIGHT_ANGLES, rounds: 3 },
    difficulty: 4,
  },
  {
    id: 5,
    title: '八方大挑战',
    directions: [...BASIC, ...DIAGONAL],
    rotation: { mode: 'random', choices: ALL_ANGLES, rounds: 3 },
    difficulty: 5,
  },
];
