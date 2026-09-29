import type { DirectionCard } from '../ui/DirectionCard';
import type { ScreenPoint } from '../scene/SceneManager';

export type PlaceResult = { accepted: true; snapTo: ScreenPoint } | { accepted: false };

export interface TapHandlers {
  canSelect(card: DirectionCard): boolean;
  /** 选中的卡片发生变化（null 表示取消选中）。 */
  onSelect(card: DirectionCard | null): void;
  /** 选中卡片时指针在舞台上移动（鼠标悬停高亮）。 */
  onHover(point: ScreenPoint | null): void;
  /** 点击舞台；card 为当前选中的卡片（可能为空）。 */
  onPlace(card: DirectionCard | null, point: ScreenPoint): PlaceResult;
  /** 放对后卡片飞到圆圈的动画结束时调用。 */
  onSettled(card: DirectionCard): void;
}

const FLY_MS = 320;

/**
 * 点选交互：先点一张卡片，再点小狗身边的圆圈。
 * 统一使用 Pointer Events，鼠标、触摸、触控笔共用一套逻辑。
 */
export class TapManager {
  private selectedCard: DirectionCard | null = null;
  private readonly handlers: TapHandlers;
  private readonly cleanups = new Map<DirectionCard, () => void>();
  private readonly ghosts = new Set<HTMLElement>();

  constructor(stage: HTMLElement, handlers: TapHandlers) {
    this.handlers = handlers;
    stage.addEventListener('pointerdown', (e) => {
      if (!isPrimaryPress(e)) return;
      e.preventDefault();
      this.onStageTap({ x: e.clientX, y: e.clientY });
    });
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.handlers.onHover(this.selectedCard ? { x: e.clientX, y: e.clientY } : null);
    });
    stage.addEventListener('pointerleave', () => this.handlers.onHover(null));
  }

  get selected(): DirectionCard | null {
    return this.selectedCard;
  }

  register(card: DirectionCard): void {
    const down = (e: PointerEvent) => {
      if (!isPrimaryPress(e)) return;
      e.preventDefault();
      this.onCardTap(card);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      this.onCardTap(card);
    };
    card.element.addEventListener('pointerdown', down);
    card.element.addEventListener('keydown', key);
    this.cleanups.set(card, () => {
      card.element.removeEventListener('pointerdown', down);
      card.element.removeEventListener('keydown', key);
    });
  }

  unregisterAll(): void {
    this.select(null);
    this.ghosts.forEach((ghost) => ghost.remove());
    this.ghosts.clear();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.clear();
  }

  select(card: DirectionCard | null): void {
    if (this.selectedCard === card) return;
    this.selectedCard?.setSelected(false);
    this.selectedCard = card;
    card?.setSelected(true);
    this.handlers.onSelect(card);
  }

  private onCardTap(card: DirectionCard): void {
    if (card.used || !this.handlers.canSelect(card)) return;
    this.select(card);
  }

  private onStageTap(point: ScreenPoint): void {
    const card = this.selectedCard;
    const result = this.handlers.onPlace(card, point);
    if (!result.accepted || !card) return;
    this.selectedCard = null;
    card.setSelected(false);
    this.flyToZone(card, result.snapTo);
    card.setUsed(true);
  }

  private flyToZone(card: DirectionCard, target: ScreenPoint): void {
    const rect = card.element.getBoundingClientRect();
    const ghost = card.element.cloneNode(true) as HTMLElement;
    ghost.classList.remove('selected');
    ghost.classList.add('fly-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);
    this.ghosts.add(ghost);

    const dx = target.x - (rect.left + rect.width / 2);
    const dy = target.y - (rect.top + rect.height / 2);
    ghost.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity ${FLY_MS}ms`;
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.7)`;
      ghost.style.opacity = '0.2';
    });
    window.setTimeout(() => {
      if (!this.ghosts.delete(ghost)) return;
      ghost.remove();
      this.handlers.onSettled(card);
    }, FLY_MS + 20);
  }
}

function isPrimaryPress(e: PointerEvent): boolean {
  return e.isPrimary && !(e.pointerType === 'mouse' && e.button !== 0);
}
