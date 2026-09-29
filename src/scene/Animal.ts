import {
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import {
  getWorldVector,
  normalizeAngle,
  shortestAngleDelta,
  toThreeRotationY,
  type GroundPoint,
} from '../game/DirectionSystem';

const ROTATION_DURATION = 1.1;
const HAPPY_DURATION = 0.7;
const MODEL_SCALE = 0.8;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

interface RotationTween {
  from: number;
  delta: number;
  elapsed: number;
  resolve: () => void;
}

/**
 * 程序生成的卡通小狗。模型的脸朝向本地 -z（即“前”），尾巴在 +z。
 *
 * 场景层级：
 * Animal.root（位置 + 旋转）
 *  ├── body（开心时跳一下，不影响方向）
 *  └── directionContainer（Drop Zone 挂在这里，跟随小狗旋转）
 */
export class Animal {
  readonly root = new Group();
  readonly directionContainer = new Group();
  private readonly body = new Group();
  private readonly tail = new Group();
  private readonly head = new Group();
  private angle = 0;
  private tween: RotationTween | null = null;
  private happyTime = 0;
  private clock = 0;

  constructor() {
    this.root.name = 'Animal';
    this.directionContainer.name = 'DirectionContainer';
    this.root.add(this.body, this.directionContainer);
    this.buildDog();
    this.applyRotation();
  }

  /** 当前旋转角度（度，顺时针，0 = 面朝上）。动画过程中返回插值后的角度。 */
  getRotation(): number {
    return normalizeAngle(this.angle);
  }

  /** 小狗“前方”在世界地面上的单位向量。 */
  getForwardVector(): GroundPoint {
    return getWorldVector(this.getRotation(), 'front');
  }

  isRotating(): boolean {
    return this.tween !== null;
  }

  /** 平滑转到目标角度（走最短路径），动画结束后 resolve。 */
  rotateTo(target: number): Promise<void> {
    this.tween?.resolve();
    const delta = shortestAngleDelta(this.angle, target);
    if (Math.abs(delta) < 1e-6) {
      this.tween = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.tween = { from: this.angle, delta, elapsed: 0, resolve };
    });
  }

  /** 立即设置角度（仅用于初始化）。 */
  setRotation(angle: number): void {
    this.tween?.resolve();
    this.tween = null;
    this.angle = normalizeAngle(angle);
    this.applyRotation();
  }

  /** 开心动画：跳一下 + 快速摇尾巴 + 点头。 */
  celebrate(): void {
    this.happyTime = HAPPY_DURATION;
  }

  update(dt: number): void {
    this.clock += dt;

    if (this.tween) {
      this.tween.elapsed += dt;
      const t = Math.min(this.tween.elapsed / ROTATION_DURATION, 1);
      this.angle = this.tween.from + this.tween.delta * easeInOutCubic(t);
      if (t >= 1) {
        this.angle = normalizeAngle(this.tween.from + this.tween.delta);
        const { resolve } = this.tween;
        this.tween = null;
        resolve();
      }
      this.applyRotation();
    }

    let hop = 0;
    let wagSpeed = 6;
    let nod = 0;
    if (this.happyTime > 0) {
      this.happyTime = Math.max(0, this.happyTime - dt);
      const p = 1 - this.happyTime / HAPPY_DURATION;
      hop = Math.sin(p * Math.PI) * 0.45;
      nod = Math.sin(p * Math.PI * 2) * 0.18;
      wagSpeed = 22;
    }
    const breathe = Math.sin(this.clock * 2.2) * 0.02;
    this.body.position.y = hop;
    this.body.scale.set(MODEL_SCALE, MODEL_SCALE * (1 + breathe), MODEL_SCALE);
    this.tail.rotation.y = Math.sin(this.clock * wagSpeed) * 0.5;
    this.head.rotation.x = nod;
  }

  private applyRotation(): void {
    this.root.rotation.y = toThreeRotationY(this.angle);
  }

  private buildDog(): void {
    const fur = new MeshLambertMaterial({ color: '#f2b662' });
    const cream = new MeshLambertMaterial({ color: '#fff1d6' });
    const brown = new MeshLambertMaterial({ color: '#8a5530' });
    const dark = new MeshLambertMaterial({ color: '#2b2020' });
    const white = new MeshLambertMaterial({ color: '#ffffff' });
    const pink = new MeshLambertMaterial({ color: '#ff8fab' });
    const collar = new MeshLambertMaterial({ color: '#ff5a5f' });

    const shadow = new Mesh(
      new CircleGeometry(1.05, 32),
      new MeshBasicMaterial({ color: '#2f6b2a', transparent: true, opacity: 0.25, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    shadow.scale.set(0.75 * MODEL_SCALE, 1.15 * MODEL_SCALE, 1);
    this.root.add(shadow);

    // 身体（胶囊横放，沿 z 轴）
    const torso = new Mesh(new CapsuleGeometry(0.48, 0.75, 8, 20), fur);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.85, 0.15);
    const belly = new Mesh(new SphereGeometry(0.42, 20, 16), cream);
    belly.scale.set(0.9, 0.7, 1.3);
    belly.position.set(0, 0.68, 0.1);
    this.body.add(torso, belly);

    // 腿
    const legGeometry = new CylinderGeometry(0.13, 0.13, 0.55, 12);
    const pawGeometry = new SphereGeometry(0.16, 12, 10);
    for (const [x, z] of [
      [-0.27, -0.3],
      [0.27, -0.3],
      [-0.27, 0.55],
      [0.27, 0.55],
    ]) {
      const leg = new Mesh(legGeometry, fur);
      leg.position.set(x, 0.3, z);
      const paw = new Mesh(pawGeometry, cream);
      paw.scale.set(1, 0.6, 1.2);
      paw.position.set(x, 0.07, z - 0.04);
      this.body.add(leg, paw);
    }

    // 项圈
    const ring = new Mesh(new TorusGeometry(0.36, 0.07, 10, 24), collar);
    ring.position.set(0, 1.12, -0.42);
    ring.rotation.x = Math.PI / 2.6;
    const tag = new Mesh(new SphereGeometry(0.08, 10, 8), new MeshLambertMaterial({ color: '#ffd23f' }));
    tag.position.set(0, 0.98, -0.72);
    this.body.add(ring, tag);

    // 头（脸朝 -z）
    this.head.position.set(0, 1.45, -0.68);
    this.body.add(this.head);
    const skull = new Mesh(new SphereGeometry(0.52, 24, 20), fur);
    const snout = new Mesh(new SphereGeometry(0.3, 20, 16), cream);
    snout.scale.set(1.1, 0.8, 1.1);
    snout.position.set(0, -0.14, -0.42);
    const nose = new Mesh(new SphereGeometry(0.1, 12, 10), dark);
    nose.scale.set(1.3, 1, 1);
    nose.position.set(0, -0.04, -0.72);
    const tongue = new Mesh(new SphereGeometry(0.09, 10, 8), pink);
    tongue.scale.set(1, 0.5, 1.2);
    tongue.position.set(0, -0.32, -0.55);
    this.head.add(skull, snout, nose, tongue);

    const eyeWhiteGeometry = new SphereGeometry(0.12, 14, 12);
    const pupilGeometry = new SphereGeometry(0.07, 12, 10);
    const cheekGeometry = new CircleGeometry(0.08, 16);
    const cheekMaterial = new MeshBasicMaterial({ color: '#ffb3c1' });
    for (const side of [-1, 1]) {
      const eye = new Mesh(eyeWhiteGeometry, white);
      eye.position.set(0.2 * side, 0.12, -0.42);
      const pupil = new Mesh(pupilGeometry, dark);
      pupil.position.set(0.2 * side, 0.12, -0.52);
      const shine = new Mesh(new SphereGeometry(0.025, 8, 6), white);
      shine.position.set(0.2 * side + 0.03, 0.16, -0.585);
      const cheek = new Mesh(cheekGeometry, cheekMaterial);
      cheek.position.set(0.33 * side, -0.1, -0.4);
      cheek.rotation.y = side * 0.6 + Math.PI;
      // 下垂的大耳朵
      const ear = new Mesh(new SphereGeometry(0.22, 16, 12), brown);
      ear.scale.set(0.55, 1.2, 0.9);
      ear.position.set(0.5 * side, 0.02, 0.02);
      ear.rotation.z = side * 0.35;
      this.head.add(eye, pupil, shine, cheek, ear);
    }
    const tuft = new Mesh(new ConeGeometry(0.1, 0.22, 10), brown);
    tuft.position.set(0, 0.55, -0.05);
    this.head.add(tuft);

    // 尾巴（在身后 +z，向上翘）
    this.tail.position.set(0, 1.05, 0.85);
    this.body.add(this.tail);
    const tailStick = new Mesh(new CylinderGeometry(0.07, 0.1, 0.6, 10), fur);
    tailStick.position.set(0, 0.22, 0.12);
    tailStick.rotation.x = 0.6;
    const tailTip = new Mesh(new SphereGeometry(0.11, 12, 10), cream);
    tailTip.position.set(0, 0.46, 0.28);
    this.tail.add(tailStick, tailTip);
  }
}
