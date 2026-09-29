import { SoundManager } from '../audio/SoundManager';
import { levels } from '../data/levels';
import { DragManager, type DropResult } from '../interaction/DragManager';
import { DropZone } from '../interaction/DropZone';
import { Animal } from '../scene/Animal';
import { Environment } from '../scene/Environment';
import { SceneManager, type ScreenPoint } from '../scene/SceneManager';
import type { DirectionCard } from '../ui/DirectionCard';
import { directionLabels } from '../ui/DirectionCard';
import { hintFor } from '../ui/Feedback';
import { GameUI } from '../ui/GameUI';
import { ALL_DIRECTIONS, findZoneAt, isCorrectPlacement, type Direction, type Rotation } from './DirectionSystem';
import { LevelManager, type RoundInfo } from './LevelManager';
import { ScoreManager } from './ScoreManager';

type Phase = 'menu' | 'rotating' | 'playing' | 'between';

const HIT_RADIUS = 1.5;
const HINT_AFTER_MISTAKES = 2;
const ROUND_PAUSE_MS = 1100;
const DEFAULT_QUESTION = '把卡片拖到小狗身边的圆圈里吧！';

/** 游戏生命周期：initialize → start → (回合 / 关卡) → nextLevel / restart。 */
export class Game {
  private readonly root: HTMLElement;
  private ui!: GameUI;
  private sceneManager!: SceneManager;
  private animal!: Animal;
  private drag!: DragManager;
  private readonly zones = new Map<Direction, DropZone>();
  private readonly levelManager = new LevelManager(levels);
  private readonly score = new ScoreManager();
  private readonly sound = new SoundManager();
  private phase: Phase = 'menu';
  private roundToken = 0;
  private hovered: DropZone | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  initialize(): void {
    this.ui = new GameUI(this.root, {
      onStart: () => this.start(),
      onRestartLevel: () => this.restart(),
      onNextLevel: () => this.nextLevel(),
      onRestartGame: () => this.start(),
      onToggleSound: () => {
        const muted = this.sound.toggleMuted();
        this.sound.play('click');
        return muted;
      },
      onButton: () => {
        this.sound.unlock();
        this.sound.play('click');
      },
    });
    this.ui.setSoundMuted(this.sound.muted);
    this.sceneManager = new SceneManager(this.ui.stage);
    this.sceneManager.add(new Environment().root);

    this.animal = new Animal();
    this.sceneManager.add(this.animal.root);
    for (const direction of ALL_DIRECTIONS) {
      const zone = new DropZone(direction);
      this.zones.set(direction, zone);
      this.animal.directionContainer.add(zone.object);
    }

    this.drag = new DragManager({
      canStart: () => this.phase === 'playing',
      onStart: (card) => this.onDragStart(card),
      onMove: (card, point) => this.onDragMove(card, point),
      onDrop: (card, point) => this.onDrop(card, point),
      onSettled: (card, accepted) => this.onSettled(card, accepted),
    });

    const first = this.levelManager.currentRound;
    this.ui.setLevel(first.level);
    this.ui.setProgress(0, first.totalRounds);
    this.ui.setQuestion('');
    this.ui.renderCards(first.directions, false);
    this.ui.setTrayEnabled(false);
    this.ui.showStart();

    this.sceneManager.start((dt) => this.update(dt));
  }

  start(): void {
    this.score.reset();
    this.enterRound(this.levelManager.startLevel(1, this.currentRotation()), true);
  }

  restart(): void {
    this.ui.hideOverlay();
    this.enterRound(this.levelManager.restartLevel(this.currentRotation()), true);
  }

  nextLevel(): void {
    const round = this.levelManager.nextLevel(this.currentRotation());
    if (round) this.enterRound(round, true);
  }

  update(dt: number): void {
    this.animal.update(dt);
    this.zones.forEach((zone) => zone.update(dt));
    this.ui.updatePlacedPositions((direction) => this.zoneScreenPosition(direction));
  }

  private currentRotation(): Rotation | undefined {
    const angle = Math.round(this.animal.getRotation());
    return ([0, 45, 90, 135, 180, 225, 270, 315] as const).find((a) => a === angle);
  }

  private async enterRound(round: RoundInfo, newLevel: boolean): Promise<void> {
    const token = ++this.roundToken;
    this.phase = 'rotating';
    this.hovered = null;
    if (newLevel) this.score.startLevel();

    this.drag.unregisterAll();
    const cards = this.ui.renderCards(round.directions, round.givenDirections.length > 0);
    cards.forEach((card) => this.drag.register(card));
    this.ui.setTrayEnabled(false);
    this.ui.setLevel(round.level);
    this.ui.setProgress(round.roundIndex, round.totalRounds);

    const turning = Math.abs(this.animal.getRotation() - round.rotation) > 1e-6;
    if (newLevel) this.ui.clearPlaced();
    if (turning) {
      this.ui.setQuestion('小狗转身啦～ 看看它的脸朝哪里？');
      this.sound.play('turn');
      await this.animal.rotateTo(round.rotation);
      if (token !== this.roundToken) return;
    }

    this.ui.clearPlaced();
    for (const direction of ALL_DIRECTIONS) {
      const zone = this.zones.get(direction)!;
      if (round.givenDirections.includes(direction)) {
        zone.setState('given');
        this.ui.showPlaced(direction, 'given');
      } else {
        zone.setState(round.directions.includes(direction) ? 'idle' : 'hidden');
      }
    }
    this.phase = 'playing';
    this.ui.setTrayEnabled(true);
    this.ui.setQuestion(DEFAULT_QUESTION);
  }

  private openZones(): Direction[] {
    return ALL_DIRECTIONS.filter((d) => this.zones.get(d)!.isOpen);
  }

  private zoneAt(point: ScreenPoint): DropZone | null {
    const ground = this.sceneManager.screenToGround(point.x, point.y);
    if (!ground) return null;
    const direction = findZoneAt(this.animal.getRotation(), ground, this.openZones(), { hitRadius: HIT_RADIUS });
    return direction ? this.zones.get(direction)! : null;
  }

  /** 某个方向区域当前在屏幕上的位置（也方便自动化测试定位）。 */
  getZoneScreenPosition(direction: Direction): ScreenPoint {
    return this.zoneScreenPosition(direction);
  }

  private zoneScreenPosition(direction: Direction): ScreenPoint {
    return this.sceneManager.worldToScreen(this.zones.get(direction)!.getWorldPosition());
  }

  private setHovered(zone: DropZone | null): void {
    if (this.hovered === zone) return;
    if (this.hovered?.state === 'hover') this.hovered.setState('idle');
    this.hovered = zone;
    if (zone?.isOpen) zone.setState('hover');
  }

  private onDragStart(card: DirectionCard): void {
    this.sound.unlock();
    this.sound.play('pickup');
    this.ui.setQuestion(`小狗的${directionLabels[card.direction]}方在哪里？`);
  }

  private onDragMove(_card: DirectionCard, point: ScreenPoint): void {
    this.setHovered(this.zoneAt(point));
  }

  private onDrop(card: DirectionCard, point: ScreenPoint): DropResult {
    const zone = this.zoneAt(point);
    this.setHovered(null);

    if (this.phase !== 'playing') return { accepted: false };
    if (!zone) {
      this.sound.play('miss');
      this.ui.feedback.message('把卡片放进小狗身边的圆圈里哦～');
      this.ui.setQuestion(DEFAULT_QUESTION);
      return { accepted: false };
    }

    if (isCorrectPlacement(card.direction, zone.direction)) {
      this.score.recordCorrect();
      zone.setState('placed');
      card.setUsed(true);
      const snapTo = this.zoneScreenPosition(zone.direction);
      this.ui.feedback.success(snapTo);
      this.sound.play('correct');
      this.animal.celebrate();
      return { accepted: true, snapTo };
    }

    this.score.recordMistake();
    zone.flashWrong();
    this.sound.play('wrong');
    card.wiggle();
    const needHint = this.score.consecutiveMistakes >= HINT_AFTER_MISTAKES;
    this.ui.feedback.retry(needHint ? hintFor(card.direction) : undefined);
    return { accepted: false };
  }

  private onSettled(card: DirectionCard, accepted: boolean): void {
    if (!accepted) {
      if (this.phase === 'playing' && !this.drag.isDragging) this.ui.setQuestion(DEFAULT_QUESTION);
      return;
    }
    if (this.zones.get(card.direction)?.state !== 'placed') return;
    this.ui.showPlaced(card.direction, 'placed');
    if (this.openZones().length > 0) {
      if (!this.drag.isDragging) this.ui.setQuestion(DEFAULT_QUESTION);
      return;
    }
    this.completeRound();
  }

  private completeRound(): void {
    this.phase = 'between';
    this.ui.setTrayEnabled(false);
    this.score.completeRound();
    const round = this.levelManager.currentRound;
    this.ui.setProgress(round.roundIndex + 1, round.totalRounds);
    this.ui.setQuestion('全部放对啦！🎉');
    this.sound.play('round');
    const token = this.roundToken;

    window.setTimeout(() => {
      if (token !== this.roundToken) return;
      const next = this.levelManager.nextRound();
      if (next) {
        this.enterRound(next, false);
        return;
      }
      const stars = this.score.finishLevel();
      this.phase = 'menu';
      if (this.levelManager.hasNextLevel()) {
        this.sound.play('level');
        this.ui.showLevelComplete(round.level, stars, true);
      } else {
        this.sound.play('win');
        this.ui.showAllComplete(this.score.totalStars, this.levelManager.levelCount * 3);
      }
    }, ROUND_PAUSE_MS);
  }
}
