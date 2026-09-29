/** 用 Web Audio 实时合成的简单音效，不依赖外部音频文件。 */
export type SoundName = 'click' | 'pickup' | 'correct' | 'wrong' | 'miss' | 'turn' | 'round' | 'level' | 'win';

interface Tone {
  freq: number;
  /** 相对开始的延迟（秒）。 */
  at: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  /** 结束频率，用于滑音。 */
  slideTo?: number;
}

const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;

const SOUNDS: Record<SoundName, Tone[]> = {
  click: [{ freq: 660, at: 0, duration: 0.08, type: 'triangle', volume: 0.25 }],
  pickup: [{ freq: 440, slideTo: 720, at: 0, duration: 0.12, type: 'sine', volume: 0.3 }],
  correct: [
    { freq: C6, at: 0, duration: 0.14, type: 'triangle' },
    { freq: E6, at: 0.09, duration: 0.24, type: 'triangle' },
  ],
  wrong: [
    { freq: 392, at: 0, duration: 0.16, type: 'sine', volume: 0.3 },
    { freq: 330, at: 0.14, duration: 0.24, type: 'sine', volume: 0.3 },
  ],
  miss: [{ freq: 520, slideTo: 380, at: 0, duration: 0.18, type: 'sine', volume: 0.2 }],
  turn: [{ freq: 300, slideTo: 620, at: 0, duration: 0.5, type: 'sine', volume: 0.15 }],
  round: [C5, E5, G5, C6].map((freq, i) => ({ freq, at: i * 0.09, duration: 0.2, type: 'triangle' as const })),
  level: [C5, E5, G5, C6, G5, C6].map((freq, i) => ({ freq, at: i * 0.12, duration: i === 5 ? 0.5 : 0.18, type: 'triangle' as const })),
  win: [C5, D5, E5, G5, A5, C6, E6].map((freq, i) => ({ freq, at: i * 0.11, duration: i === 6 ? 0.7 : 0.18, type: 'triangle' as const })),
};

const STORAGE_KEY = 'direction-game-muted';
const MASTER_VOLUME = 0.5;

export class SoundManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private mutedState: boolean;

  constructor() {
    this.mutedState = readMuted();
  }

  get muted(): boolean {
    return this.mutedState;
  }

  setMuted(muted: boolean): void {
    this.mutedState = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // 隐私模式下 localStorage 可能不可用，忽略即可。
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.mutedState);
    return this.mutedState;
  }

  /** 浏览器要求在用户手势中创建 / 恢复 AudioContext。 */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx?.state === 'suspended') void ctx.resume();
  }

  play(name: SoundName): void {
    if (this.mutedState) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + 0.01;
    for (const tone of SOUNDS[name]) this.playTone(ctx, this.master, tone, start);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof AudioContext === 'undefined') return null;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = MASTER_VOLUME;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private playTone(ctx: AudioContext, output: AudioNode, tone: Tone, start: number): void {
    const t0 = start + tone.at;
    const t1 = t0 + tone.duration;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(tone.slideTo, t1);
    const peak = tone.volume ?? 0.35;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(output);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
