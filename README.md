# 小动物的方向大冒险

面向 6 岁儿童的空间方位认知小游戏：把「前 / 后 / 左 / 右 / 左前 / 右前 / 左后 / 右后」卡片放到小狗身边正确的圆圈里：先点一张卡片，再点圆圈。
核心认知：**方位是相对于小狗自身朝向的，小狗转了，它的前后左右也跟着转；世界（树、石头）没有动。**

技术栈：Vite + TypeScript + Three.js + 原生 CSS（无框架、无后端）。

## 启动

需要 Node.js 20+。

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm test           # 单元测试（Vitest）
npm run typecheck  # TypeScript 类型检查
npm run build      # 类型检查 + 生产构建到 dist/
```

> `.npmrc` 中启用了 `legacy-peer-deps`，用于绕过当前 npm 版本在解析 vite / vitest 可选 peer 依赖时的 `edgesOut` 崩溃。

## 目录

```text
src/
├── main.ts                 入口，只负责创建 Game
├── game/
│   ├── Game.ts             游戏生命周期：initialize / start / nextLevel / restart / update
│   ├── DirectionSystem.ts  方向计算核心（纯函数，无 DOM / Three.js 依赖）
│   ├── LevelManager.ts     关卡 / 回合状态、随机旋转、过关判断
│   └── ScoreManager.ts     星星、错误次数、连续错误
├── scene/
│   ├── SceneManager.ts     渲染器、灯光、尺寸适配、屏幕↔地面坐标换算
│   ├── Camera.ts           固定斜上方俯视摄像机（不跟随小狗）
│   ├── Animal.ts           程序生成的小狗、平滑旋转、开心动画
│   └── Environment.ts      草地、树、石头、花、云（固定不动）
├── interaction/
│   ├── TapManager.ts       点选交互：先点卡片再点圆圈（Pointer Events，鼠标 / 触摸 / 触控笔 / 键盘）
│   └── DropZone.ts         小狗周围的方位圆圈（挂在小狗的 DirectionContainer 下）
├── audio/SoundManager.ts   Web Audio 合成音效 + 静音开关
├── ui/
│   ├── GameUI.ts           顶栏、题目、托盘、放置标签、弹层
│   ├── DirectionCard.ts    方向卡片 + 中文显示映射
│   └── Feedback.ts         “太棒啦！” / “再想一想～” / 提示 + 星星粒子
├── data/levels.ts          关卡配置
└── styles/main.css
tests/                      DirectionSystem / LevelManager / ScoreManager 单元测试
```

## 方向计算（DirectionSystem）

- 地面坐标用 Three.js 的 x / z：x 向右，z 朝屏幕下方；“上 / 北” = -z。
- 小狗旋转角 `rotation` 以度为单位，从“上”开始**顺时针**：0° 面朝上、90° 面朝右……
- 每个自身方向有一个相对“前”的顺时针偏移：front 0、front-right 45、right 90、back-right 135、back 180、back-left 225、left 270、front-left 315。
- 世界朝向 = `normalize(rotation + offset)`，单位向量 = `(sin θ, -cos θ)`，区域位置 = `中心 + 向量 × 半径`。
- 命中检测 `findZoneAt`：把指针射线打到地面得到点，在“还没放置的候选方向”里找最近且在命中半径内的区域。
- Three.js 中小狗 `rotation.y = -rotation`（Three.js 逆时针为正），Drop Zone 以本地位置挂在小狗下面，所以自动跟着转；测试里验证了场景图结果与纯函数结果一致。

例：旋转 90° 时，前 = 右（east）、后 = 左（west）、左 = 上（north）、右 = 下（south）。

## 关卡（src/data/levels.ts）

| 关卡 | 卡片 | 小狗旋转 |
|---|---|---|
| 1 前和后 | 前、后 | 固定 0° → 180° |
| 2 左和右 | 前、后、左、右 | 固定 0° → 90° |
| 3 小狗转圈圈 | 前、后、左、右 | 随机 0/90/180/270°，3 回合 |
| 4 斜着的方向 | 左前、右前、左后、右后（前后左右已预先摆好，卡片显示“前 + 左”） | 随机 0/90/180/270°，3 回合 |
| 5 八方大挑战 | 全部八个方向 | 随机 8 个角度，3 回合 |

每回合把所有卡片放对即得一颗进度星；过关按错误次数给 1～3 颗星。相邻回合不会重复同一角度，回合切换时小狗会带着上一回合的标签平滑转身，帮助理解“方向跟着小狗转”。

## 反馈

- 放对：卡片飞到圆圈、星星粒子、“太棒啦！”、小狗跳一下并快速摇尾巴。
- 放错：卡片平滑回到原位、圆圈闪橙色、“再想一想～”；连续错 2 次给轻提示（如“看看小狗的脸朝哪里？”），不直接给答案。
- 音效：拿起卡片、放对（叮咚）、放错（柔和低音）、小狗转身、回合 / 过关 / 通关旋律，全部由 Web Audio 实时合成（`src/audio/SoundManager.ts`），无音频文件；顶栏「🔊 声音」按钮可静音，设置保存在 localStorage。
- 点选：选中的卡片会抬起并加橙色描边，点另一张可换选；放错后卡片保持选中，可直接再点别的圆圈。点到空白处提示“点小狗身边的圆圈哦～”，不计错误。

## 后续可扩展

GLB / GLTF 动物模型、语音朗读题目、家长模式（错题统计）、自适应难度、更多动物（共享同一个 DirectionSystem）。
