import type { DirectionCard } from '../ui/DirectionCard';
import type { ScreenPoint } from '../scene/SceneManager';

export type DropResult = { accepted: true; snapTo: ScreenPoint } | { accepted: false };

export interface DragHandlers {
  canStart(card: DirectionCard): boolean;
  onStart(card: DirectionCard): void;
  onMove(card: DirectionCard, point: ScreenPoint): void;
  onDrop(card: DirectionCard, point: ScreenPoint): DropResult;
  /** 放置 / 回弹动画结束后调用。 */
  onSettled(card: DirectionCard, accepted: boolean): void;
}

interface ActiveDrag {
  card: DirectionCard;
  pointerId: number;
  ghost: HTMLElement;
  offsetX: number;
  offsetY: number;
  originLeft: number;
  originTop: number;
}

const SNAP_MS = 260;
const RETURN_MS = 380;

/**
 * 统一使用 Pointer Events 的拖拽管理：鼠标、触摸、触控笔共用一套逻辑。
 * 只负责拖拽过程本身，是否正确由 onDrop 回调决定。
 */
export class DragManager {
  private active: ActiveDrag | null = null;
  private readonly handlers: DragHandlers;
  private readonly cleanups = new Map<DirectionCard, () => void>();

  constructor(handlers: DragHandlers) {
    this.handlers = handlers;
  }

  get isDragging(): boolean {
    return this.active !== null;
  }

  register(card: DirectionCard): void {
    const el = card.element;
    const down = (e: PointerEvent) => this.onPointerDown(card, e);
    const move = (e: PointerEvent) => this.onPointerMove(e);
    const up = (e: PointerEvent) => this.onPointerUp(e);
    const cancel = (e: PointerEvent) => this.onPointerCancel(e);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    this.cleanups.set(card, () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    });
  }

  unregisterAll(): void {
    if (this.active) {
      this.active.ghost.remove();
      this.active = null;
    }
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.clear();
  }

  private onPointerDown(card: DirectionCard, e: PointerEvent): void {
    if (this.active || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (card.used || !this.handlers.canStart(card)) return;
    e.preventDefault();
    card.element.setPointerCapture(e.pointerId);

    const rect = card.element.getBoundingClientRect();
    const ghost = card.element.cloneNode(true) as HTMLElement;
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);

    this.active = {
      card,
      pointerId: e.pointerId,
      ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      originLeft: rect.left,
      originTop: rect.top,
    };
    card.setDragging(true);
    this.moveGhost(e.clientX, e.clientY);
    this.handlers.onStart(card);
    this.handlers.onMove(card, { x: e.clientX, y: e.clientY });
  }

  private onPointerMove(e: PointerEvent): void {
    const drag = this.active;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    this.moveGhost(e.clientX, e.clientY);
    this.handlers.onMove(drag.card, { x: e.clientX, y: e.clientY });
  }

  private onPointerUp(e: PointerEvent): void {
    const drag = this.active;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.active = null;
    const result = this.handlers.onDrop(drag.card, { x: e.clientX, y: e.clientY });
    if (result.accepted) {
      this.animateGhost(drag, result.snapTo.x - drag.ghost.offsetWidth / 2, result.snapTo.y - drag.ghost.offsetHeight / 2, SNAP_MS, true);
    } else {
      this.animateGhost(drag, drag.originLeft, drag.originTop, RETURN_MS, false);
    }
  }

  private onPointerCancel(e: PointerEvent): void {
    const drag = this.active;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.active = null;
    this.animateGhost(drag, drag.originLeft, drag.originTop, RETURN_MS, false);
  }

  private moveGhost(clientX: number, clientY: number): void {
    const drag = this.active;
    if (!drag) return;
    const x = clientX - drag.offsetX - drag.originLeft;
    const y = clientY - drag.offsetY - drag.originTop;
    drag.ghost.style.transform = `translate(${x}px, ${y}px) scale(1.12)`;
  }

  private animateGhost(drag: ActiveDrag, left: number, top: number, duration: number, accepted: boolean): void {
    const { ghost, card } = drag;
    ghost.classList.add(accepted ? 'snapping' : 'returning');
    ghost.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity ${duration}ms`;
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${left - drag.originLeft}px, ${top - drag.originTop}px) scale(${accepted ? 0.8 : 1})`;
      if (accepted) ghost.style.opacity = '0';
    });
    window.setTimeout(() => {
      ghost.remove();
      card.setDragging(false);
      this.handlers.onSettled(card, accepted);
    }, duration + 20);
  }
}
