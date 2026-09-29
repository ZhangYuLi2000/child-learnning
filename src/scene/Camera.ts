import { PerspectiveCamera, Vector3 } from 'three';

const FOV = 42;
/** 摄像机俯视角（与地面的夹角）。 */
const ELEVATION_DEG = 58;
/** 需要保证在画面中完整可见的半径（Drop Zone 外沿 + 余量）。 */
const VIEW_RADIUS = 4.4;
const TARGET = new Vector3(0, 0.4, 0);

/** 固定斜上方俯视摄像机：只随窗口比例调整距离，永远不跟随动物旋转。 */
export function createCamera(aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(FOV, aspect, 0.1, 200);
  fitCamera(camera, aspect);
  return camera;
}

export function fitCamera(camera: PerspectiveCamera, aspect: number): void {
  camera.aspect = aspect;
  const halfV = Math.tan(((FOV / 2) * Math.PI) / 180);
  const elevation = (ELEVATION_DEG * Math.PI) / 180;
  const needForHeight = (VIEW_RADIUS * Math.sin(elevation) + 0.8) / halfV;
  const needForWidth = VIEW_RADIUS / (halfV * aspect);
  const distance = Math.max(needForHeight, needForWidth);
  camera.position.set(
    TARGET.x,
    TARGET.y + distance * Math.sin(elevation),
    TARGET.z + distance * Math.cos(elevation),
  );
  camera.lookAt(TARGET);
  camera.updateProjectionMatrix();
}
