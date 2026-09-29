import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Plane,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
  type PerspectiveCamera,
} from 'three';
import type { GroundPoint } from '../game/DirectionSystem';
import { createCamera, fitCamera } from './Camera';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** 负责 Three.js 渲染器、场景、灯光、摄像机、尺寸适配和坐标换算。 */
export class SceneManager {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly container: HTMLElement;
  private readonly raycaster = new Raycaster();
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly pointer = new Vector2();
  private readonly hit = new Vector3();
  private readonly projected = new Vector3();
  private readonly timer = new Timer();
  private readonly resizeObserver: ResizeObserver;
  private updateCallback: ((dt: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.domElement.classList.add('stage-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene.background = new Color('#bfe6ff');
    this.camera = createCamera(this.aspect());
    this.addLights();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  add(object: Object3D): void {
    this.scene.add(object);
  }

  start(update: (dt: number) => void): void {
    this.updateCallback = update;
    this.timer.connect(document);
    this.renderer.setAnimationLoop((time) => this.frame(time));
  }

  /** 屏幕坐标（clientX/Y）→ 地面坐标；没有打到地面时返回 null。 */
  screenToGround(clientX: number, clientY: number): GroundPoint | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const result = this.raycaster.ray.intersectPlane(this.groundPlane, this.hit);
    return result ? { x: result.x, z: result.z } : null;
  }

  /** 世界坐标 → 屏幕坐标（clientX/Y）。 */
  worldToScreen(world: Vector3): ScreenPoint {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.projected.copy(world).project(this.camera);
    return {
      x: rect.left + ((this.projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - this.projected.y) / 2) * rect.height,
    };
  }

  private frame(time: number): void {
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.updateCallback?.(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private aspect(): number {
    const { clientWidth, clientHeight } = this.container;
    return clientHeight > 0 ? clientWidth / clientHeight : 1;
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    fitCamera(this.camera, this.aspect());
  }

  private addLights(): void {
    this.scene.add(new HemisphereLight('#ffffff', '#8fcf6a', 1.6));
    this.scene.add(new AmbientLight('#ffffff', 0.4));
    const sun = new DirectionalLight('#fff4e0', 1.6);
    sun.position.set(-4, 10, 6);
    this.scene.add(sun);
  }
}
