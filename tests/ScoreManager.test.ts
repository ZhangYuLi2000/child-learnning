import { describe, expect, it } from 'vitest';
import { ScoreManager } from '../src/game/ScoreManager';

describe('ScoreManager', () => {
  it('没有错误得 3 颗星', () => {
    const score = new ScoreManager();
    score.recordCorrect();
    expect(score.finishLevel()).toBe(3);
    expect(score.totalStars).toBe(3);
  });

  it('连续错误计数，答对后清零', () => {
    const score = new ScoreManager();
    score.recordMistake();
    score.recordMistake();
    expect(score.consecutiveMistakes).toBe(2);
    score.recordCorrect();
    expect(score.consecutiveMistakes).toBe(0);
    expect(score.levelMistakes).toBe(2);
    expect(score.getLevelStars()).toBe(2);
  });

  it('错误较多时至少也有 1 颗星', () => {
    const score = new ScoreManager();
    for (let i = 0; i < 10; i += 1) score.recordMistake();
    expect(score.getLevelStars()).toBe(1);
  });

  it('startLevel 清空本关数据但保留总星数，reset 全部清空', () => {
    const score = new ScoreManager();
    score.finishLevel();
    score.recordMistake();
    score.completeRound();
    score.startLevel();
    expect(score.levelMistakes).toBe(0);
    expect(score.roundsCompleted).toBe(0);
    expect(score.totalStars).toBe(3);
    score.reset();
    expect(score.totalStars).toBe(0);
  });
});
