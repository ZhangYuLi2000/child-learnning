import { isDiagonal, type Direction } from '../game/DirectionSystem';
import type { ScreenPoint } from '../scene/SceneManager';
import { componentHint, directionLabels } from './DirectionCard';

const PRAISES = ['太棒啦！', '真厉害！', '答对啦！', '好聪明！'];
const RETRIES = ['再想一想～', '差一点点～', '再试试看～'];
const BURST = ['✨', '⭐', '🎉', '🌟', '💛'];

/** 根据方向给出轻微提示，不直接给出答案。 */
export function hintFor(direction: Direction): string {
  if (direction === 'front' || direction === 'back') return '看看小狗的脸朝哪里？';
  if (direction === 'left' || direction === 'right') return '想象你站在小狗身后，和它看同一个方向～';
  if (isDiagonal(direction)) return `${directionLabels[direction]} = ${componentHint(direction)}，找找它们中间～`;
  return '看看小狗的脸朝哪里？';
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** 儿童友好的正确 / 错误反馈（文字气泡 + 星星粒子）。 */
export class Feedback {
  private readonly layer: HTMLElement;
  private readonly bubble: HTMLDivElement;
  private hideTimer = 0;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.bubble = document.createElement('div');
    this.bubble.className = 'feedback-bubble';
    this.bubble.setAttribute('aria-live', 'polite');
    layer.appendChild(this.bubble);
  }

  success(at: ScreenPoint): void {
    this.show(pick(PRAISES), 'good');
    this.burst(at);
  }

  retry(hint?: string): void {
    this.show(hint ? `${pick(RETRIES)}\n${hint}` : pick(RETRIES), hint ? 'hint' : 'soft', hint ? 2600 : 1400);
  }

  message(text: string, duration = 1600): void {
    this.show(text, 'soft', duration);
  }

  private show(text: string, tone: 'good' | 'soft' | 'hint', duration = 1300): void {
    window.clearTimeout(this.hideTimer);
    this.bubble.textContent = text;
    this.bubble.className = `feedback-bubble show ${tone}`;
    this.hideTimer = window.setTimeout(() => {
      this.bubble.classList.remove('show');
    }, duration);
  }

  private burst(at: ScreenPoint): void {
    const rect = this.layer.getBoundingClientRect();
    for (let i = 0; i < 10; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.textContent = BURST[i % BURST.length];
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 60 + Math.random() * 50;
      particle.style.left = `${at.x - rect.left}px`;
      particle.style.top = `${at.y - rect.top}px`;
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 30}px`);
      this.layer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 1000);
    }
  }
}
