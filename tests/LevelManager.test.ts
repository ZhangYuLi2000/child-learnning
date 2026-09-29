import { describe, expect, it } from 'vitest';
import { levels } from '../src/data/levels';
import { LevelManager } from '../src/game/LevelManager';
import { ALL_DIRECTIONS, isAllowedRotation } from '../src/game/DirectionSystem';

function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('levels 数据', () => {
  it('包含 5 个关卡，id 连续', () => {
    expect(levels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('关卡 1 只有前后，关卡 5 有完整八方向', () => {
    expect(levels[0].directions).toEqual(['front', 'back']);
    expect([...levels[4].directions].sort()).toEqual([...ALL_DIRECTIONS].sort());
  });

  it('所有旋转角度都在允许范围内', () => {
    for (const level of levels) {
      const angles = level.rotation.mode === 'fixed' ? level.rotation.angles : level.rotation.choices;
      for (const a of angles) expect(isAllowedRotation(a)).toBe(true);
    }
  });
});

describe('LevelManager', () => {
  it('level = 3 得到正确配置', () => {
    const manager = new LevelManager(levels);
    const level = manager.getLevelConfig(3);
    expect(level.directions).toEqual(['front', 'back', 'left', 'right']);
    expect(level.rotation.mode).toBe('random');
  });

  it('默认从第 1 关第 1 回合开始，固定旋转按配置执行', () => {
    const manager = new LevelManager(levels);
    expect(manager.currentRound.level.id).toBe(1);
    expect(manager.currentRound.rotation).toBe(0);
    expect(manager.nextRound()?.rotation).toBe(180);
    expect(manager.nextRound()).toBeNull();
  });

  it('随机关卡：使用注入的随机源，且相邻回合不重复', () => {
    const manager = new LevelManager(levels, sequence([0, 0, 0]));
    manager.startLevel(3, 0);
    const plan = manager.rotationPlan;
    expect(plan).toHaveLength(3);
    expect(plan[0]).not.toBe(0);
    for (let i = 1; i < plan.length; i += 1) expect(plan[i]).not.toBe(plan[i - 1]);
  });

  it('随机关卡：相同随机序列得到相同结果', () => {
    const a = new LevelManager(levels, sequence([0.1, 0.7, 0.4, 0.9]));
    const b = new LevelManager(levels, sequence([0.1, 0.7, 0.4, 0.9]));
    expect(a.startLevel(5).rotation).toBe(b.startLevel(5).rotation);
    expect(a.rotationPlan).toEqual(b.rotationPlan);
  });

  it('第 4 关预先给出四个基本方向', () => {
    const manager = new LevelManager(levels);
    expect(manager.startLevel(4).givenDirections).toEqual(['front', 'back', 'left', 'right']);
  });

  it('下一关 / 最后一关', () => {
    const manager = new LevelManager(levels);
    expect(manager.nextLevel()?.level.id).toBe(2);
    manager.startLevel(5);
    expect(manager.hasNextLevel()).toBe(false);
    expect(manager.nextLevel()).toBeNull();
  });

  it('重玩回到第 1 回合', () => {
    const manager = new LevelManager(levels);
    manager.startLevel(2);
    manager.nextRound();
    expect(manager.restartLevel().roundIndex).toBe(0);
  });

  it('不存在的关卡抛错', () => {
    const manager = new LevelManager(levels);
    expect(() => manager.getLevelConfig(99)).toThrow();
  });
});
