/** 记录星星、错误次数和连续错误次数。不依赖 DOM / Three.js。 */
export class ScoreManager {
  private totalStarsValue = 0;
  private levelMistakesValue = 0;
  private consecutiveMistakesValue = 0;
  private roundsCompletedValue = 0;

  get totalStars(): number {
    return this.totalStarsValue;
  }

  get levelMistakes(): number {
    return this.levelMistakesValue;
  }

  get consecutiveMistakes(): number {
    return this.consecutiveMistakesValue;
  }

  get roundsCompleted(): number {
    return this.roundsCompletedValue;
  }

  recordCorrect(): void {
    this.consecutiveMistakesValue = 0;
  }

  recordMistake(): void {
    this.levelMistakesValue += 1;
    this.consecutiveMistakesValue += 1;
  }

  completeRound(): void {
    this.roundsCompletedValue += 1;
  }

  /** 过关星级：鼓励为主，最少 1 颗星。 */
  getLevelStars(): 1 | 2 | 3 {
    if (this.levelMistakesValue === 0) return 3;
    if (this.levelMistakesValue <= 2) return 2;
    return 1;
  }

  /** 结算当前关卡，返回获得的星星数并累加到总数。 */
  finishLevel(): number {
    const stars = this.getLevelStars();
    this.totalStarsValue += stars;
    return stars;
  }

  startLevel(): void {
    this.levelMistakesValue = 0;
    this.consecutiveMistakesValue = 0;
    this.roundsCompletedValue = 0;
  }

  reset(): void {
    this.totalStarsValue = 0;
    this.startLevel();
  }
}
