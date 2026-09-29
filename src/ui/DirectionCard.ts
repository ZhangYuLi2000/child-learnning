import { getComponents, isDiagonal, type Direction } from '../game/DirectionSystem';

export const directionLabels: Record<Direction, string> = {
  front: '前',
  back: '后',
  left: '左',
  right: '右',
  'front-left': '左前',
  'front-right': '右前',
  'back-left': '左后',
  'back-right': '右后',
};

/** “前 + 左”这样的组合提示文字。 */
export function componentHint(direction: Direction): string {
  return getComponents(direction)
    .map((d) => directionLabels[d])
    .join(' + ');
}

/** 底部可点选的方向卡片。 */
export class DirectionCard {
  readonly direction: Direction;
  readonly element: HTMLDivElement;

  constructor(direction: Direction, showComponents: boolean) {
    this.direction = direction;
    this.element = document.createElement('div');
    this.element.className = `direction-card card-${direction}`;
    this.element.dataset.direction = direction;
    this.element.setAttribute('role', 'button');
    this.element.tabIndex = 0;
    this.element.setAttribute('aria-pressed', 'false');
    this.element.setAttribute('aria-label', `方向卡片：${directionLabels[direction]}`);
    const label = document.createElement('span');
    label.className = 'card-label';
    label.textContent = directionLabels[direction];
    this.element.appendChild(label);
    if (showComponents && isDiagonal(direction)) {
      const sub = document.createElement('span');
      sub.className = 'card-sub';
      sub.textContent = componentHint(direction);
      this.element.appendChild(sub);
    }
  }

  get used(): boolean {
    return this.element.classList.contains('used');
  }

  setUsed(used: boolean): void {
    this.element.classList.toggle('used', used);
  }

  setSelected(selected: boolean): void {
    this.element.classList.toggle('selected', selected);
    this.element.setAttribute('aria-pressed', String(selected));
  }

  wiggle(): void {
    this.element.classList.remove('wiggle');
    void this.element.offsetWidth;
    this.element.classList.add('wiggle');
  }
}
