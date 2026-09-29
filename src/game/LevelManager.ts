import type { LevelConfig } from '../data/levels';
import type { Direction, Rotation } from './DirectionSystem';

export type RandomSource = () => number;

export interface RoundInfo {
  level: LevelConfig;
  roundIndex: number;
  totalRounds: number;
  rotation: Rotation;
  directions: readonly Direction[];
  givenDirections: readonly Direction[];
}

/** 关卡状态机：当前关卡 / 回合、每回合的动物旋转角度、过关判断。不依赖 DOM / Three.js。 */
export class LevelManager {
  private levelIndex = 0;
  private roundIndex = 0;
  private plan: Rotation[] = [];
  private readonly levels: readonly LevelConfig[];
  private readonly random: RandomSource;

  constructor(levels: readonly LevelConfig[], random: RandomSource = Math.random) {
    if (levels.length === 0) throw new Error('LevelManager 至少需要一个关卡');
    this.levels = levels;
    this.random = random;
    this.startLevel(1);
  }

  get levelCount(): number {
    return this.levels.length;
  }

  getLevelConfig(levelId: number): LevelConfig {
    const level = this.levels.find((item) => item.id === levelId);
    if (!level) throw new Error(`找不到关卡 ${levelId}`);
    return level;
  }

  get currentLevel(): LevelConfig {
    return this.levels[this.levelIndex];
  }

  get currentRound(): RoundInfo {
    const level = this.currentLevel;
    return {
      level,
      roundIndex: this.roundIndex,
      totalRounds: this.plan.length,
      rotation: this.plan[this.roundIndex],
      directions: level.directions,
      givenDirections: level.givenDirections ?? [],
    };
  }

  get rotationPlan(): readonly Rotation[] {
    return this.plan;
  }

  startLevel(levelId: number, previousRotation?: Rotation): RoundInfo {
    const index = this.levels.findIndex((item) => item.id === levelId);
    if (index < 0) throw new Error(`找不到关卡 ${levelId}`);
    this.levelIndex = index;
    this.roundIndex = 0;
    this.plan = this.buildPlan(this.levels[index], previousRotation);
    return this.currentRound;
  }

  restartLevel(previousRotation?: Rotation): RoundInfo {
    return this.startLevel(this.currentLevel.id, previousRotation);
  }

  isLastRound(): boolean {
    return this.roundIndex >= this.plan.length - 1;
  }

  hasNextLevel(): boolean {
    return this.levelIndex < this.levels.length - 1;
  }

  /** 进入下一回合；已经是最后一回合时返回 null（表示过关）。 */
  nextRound(): RoundInfo | null {
    if (this.isLastRound()) return null;
    this.roundIndex += 1;
    return this.currentRound;
  }

  /** 进入下一关；已经是最后一关时返回 null。 */
  nextLevel(previousRotation?: Rotation): RoundInfo | null {
    if (!this.hasNextLevel()) return null;
    return this.startLevel(this.levels[this.levelIndex + 1].id, previousRotation);
  }

  private buildPlan(level: LevelConfig, previousRotation?: Rotation): Rotation[] {
    const plan = level.rotation;
    if (plan.mode === 'fixed') return [...plan.angles];

    const result: Rotation[] = [];
    let last = previousRotation;
    for (let i = 0; i < plan.rounds; i += 1) {
      const options = plan.choices.length > 1 ? plan.choices.filter((angle) => angle !== last) : plan.choices;
      const pick = options[Math.min(options.length - 1, Math.floor(this.random() * options.length))];
      result.push(pick);
      last = pick;
    }
    return result;
  }
}
