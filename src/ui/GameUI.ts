import type { LevelConfig } from '../data/levels';
import type { Direction } from '../game/DirectionSystem';
import type { ScreenPoint } from '../scene/SceneManager';
import { DirectionCard, directionLabels } from './DirectionCard';
import { Feedback } from './Feedback';

export interface UIHandlers {
  onStart(): void;
  onRestartLevel(): void;
  onNextLevel(): void;
  onRestartGame(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 页面 DOM：顶栏、题目、3D 舞台容器、卡片托盘、放置标签、弹层。 */
export class GameUI {
  readonly stage: HTMLDivElement;
  readonly feedback: Feedback;
  private readonly levelBadge: HTMLSpanElement;
  private readonly progress: HTMLDivElement;
  private readonly question: HTMLDivElement;
  private readonly tray: HTMLDivElement;
  private readonly labelLayer: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly labels = new Map<Direction, HTMLDivElement>();
  private readonly handlers: UIHandlers;

  constructor(root: HTMLElement, handlers: UIHandlers) {
    this.handlers = handlers;
    root.innerHTML = '';
    root.classList.add('game-root');

    const topbar = el('header', 'topbar');
    const title = el('div', 'title', '🐾 小动物的方向大冒险');
    this.levelBadge = el('span', 'level-badge');
    this.progress = el('div', 'progress');
    const restart = el('button', 'icon-button', '↻ 重玩');
    restart.type = 'button';
    restart.addEventListener('click', () => this.handlers.onRestartLevel());
    const right = el('div', 'topbar-right');
    right.append(this.progress, restart);
    const left = el('div', 'topbar-left');
    left.append(title, this.levelBadge);
    topbar.append(left, right);

    this.question = el('div', 'question');
    this.stage = el('div', 'stage');
    this.labelLayer = el('div', 'label-layer');
    const feedbackLayer = el('div', 'feedback-layer');
    this.stage.append(this.labelLayer, feedbackLayer);
    this.feedback = new Feedback(feedbackLayer);

    this.tray = el('div', 'tray');
    this.overlay = el('div', 'overlay hidden');

    root.append(topbar, this.question, this.stage, this.tray, this.overlay);
  }

  setLevel(level: LevelConfig): void {
    this.levelBadge.textContent = `第 ${level.id} 关 · ${level.title}`;
  }

  setProgress(done: number, total: number): void {
    this.progress.innerHTML = '';
    this.progress.setAttribute('aria-label', `进度 ${done}/${total}`);
    for (let i = 0; i < total; i += 1) {
      this.progress.appendChild(el('span', i < done ? 'star on' : 'star', i < done ? '⭐' : '☆'));
    }
  }

  setQuestion(text: string): void {
    this.question.textContent = text;
  }

  renderCards(directions: readonly Direction[], showComponents: boolean): DirectionCard[] {
    this.tray.innerHTML = '';
    return directions.map((direction) => {
      const card = new DirectionCard(direction, showComponents);
      this.tray.appendChild(card.element);
      return card;
    });
  }

  setTrayEnabled(enabled: boolean): void {
    this.tray.classList.toggle('disabled', !enabled);
  }

  showPlaced(direction: Direction, kind: 'placed' | 'given'): void {
    let label = this.labels.get(direction);
    if (!label) {
      label = el('div', 'zone-label');
      this.labelLayer.appendChild(label);
      this.labels.set(direction, label);
    }
    label.textContent = directionLabels[direction];
    label.className = `zone-label ${kind} pop`;
  }

  clearPlaced(): void {
    this.labels.forEach((label) => label.remove());
    this.labels.clear();
  }

  /** 每帧把已放置的标签移动到对应 Drop Zone 的屏幕位置。 */
  updatePlacedPositions(project: (direction: Direction) => ScreenPoint): void {
    if (this.labels.size === 0) return;
    const rect = this.labelLayer.getBoundingClientRect();
    this.labels.forEach((label, direction) => {
      const p = project(direction);
      label.style.transform = `translate(${p.x - rect.left}px, ${p.y - rect.top}px) translate(-50%, -50%)`;
    });
  }

  showStart(): void {
    this.openOverlay(
      '🐶',
      '小动物的方向大冒险',
      '把方向卡片拖到小狗身边的圆圈里。\n注意：是小狗自己的前后左右哦！',
      [{ text: '开始游戏', primary: true, onClick: () => this.handlers.onStart() }],
    );
  }

  showLevelComplete(level: LevelConfig, stars: number, hasNext: boolean): void {
    const buttons = [
      { text: '再玩一次', primary: !hasNext, onClick: () => this.handlers.onRestartLevel() },
    ];
    if (hasNext) buttons.push({ text: '下一关 →', primary: true, onClick: () => this.handlers.onNextLevel() });
    this.openOverlay('⭐'.repeat(stars) + '☆'.repeat(3 - stars), `第 ${level.id} 关完成啦！`, '小狗说：谢谢你帮我找到方向！', buttons);
  }

  showAllComplete(totalStars: number, maxStars: number): void {
    this.openOverlay('🏆', '全部通关！', `你一共得到了 ${totalStars} / ${maxStars} 颗星星\n你已经认识八个方向啦！`, [
      { text: '重新开始', primary: true, onClick: () => this.handlers.onRestartGame() },
    ]);
  }

  hideOverlay(): void {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
  }

  private openOverlay(
    icon: string,
    title: string,
    body: string,
    buttons: Array<{ text: string; primary: boolean; onClick: () => void }>,
  ): void {
    this.overlay.innerHTML = '';
    const panel = el('div', 'overlay-panel');
    panel.append(el('div', 'overlay-icon', icon), el('h1', 'overlay-title', title), el('p', 'overlay-body', body));
    const row = el('div', 'overlay-buttons');
    for (const b of buttons) {
      const button = el('button', b.primary ? 'big-button primary' : 'big-button', b.text);
      button.type = 'button';
      button.addEventListener('click', () => {
        this.hideOverlay();
        b.onClick();
      });
      row.appendChild(button);
    }
    panel.appendChild(row);
    this.overlay.appendChild(panel);
    this.overlay.classList.remove('hidden');
  }
}
