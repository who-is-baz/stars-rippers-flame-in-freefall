// Match stick burning animation: PURE logic. (state of the data, O₂, pressure, illustrative gravity) → visual parameters, and the
// 13 s lifecycle. A CONCEPTUAL ILLUSTRATION: nothing here is read from, or compared with, a measured burning rate. In Custom, the
// data-driven state (observed glow, n < 5 grey, all extinguished, mixed, empty) is taken as given from lib/explorer.ts; this module
// only decides how that state LOOKS.
import type { FlameState } from './explorer';

export type BurnMode = 'burning' | 'ember' | 'out' | 'none';
export interface BurnInput {
  custom: FlameState | null;      // null = a scenario of the dock (not Custom)
  glow: number | null;            // Custom: observed mean burning rate on the fixed FLEX scale (0–1), from the data
  o2: number; psi: number;        // illustrative look of the atmosphere
  noTests: boolean;               // scenario with 0 exact and 0 near tests
  oneG: boolean;                  // "Earth 1 g (illustration)" reference
  reducedMotion: boolean; phone: boolean;
}
export interface BurnParams {
  mode: BurnMode;
  shape: 'round' | 'drop';        // microgravity: round flame around the tip; 1 g reference: rising teardrop
  intensity: number;              // 0–1.3 peak brightness
  tempK: number;                  // illustrative colour temperature
  flickerHz: number; flickerAmp: number;
  charCap: number;                // how far the char can advance (0–1 of the stick's burnable length)
  grayscale: boolean;
  flameScale: number;
  smoke: 'radial' | 'up';         // microgravity diffuses outward; 1 g rises
  particles: number;
  animate: boolean;               // false → one still frame
  lifecycle: boolean;             // false → hold the steady frame (no ignition / fade loop)
}

export const CYCLE_S = 13;
export const STATIC_T = 6.5;      // the still frame used when motion is reduced or the state is static

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Illustrative colour temperature of the atmosphere: ~21 % warm orange, ≥30 % yellow-white, 100 % white with a blue rim. */
export function tempForO2(o2: number): number {
  const pts: [number, number][] = [[0.12, 1700], [0.21, 2000], [0.30, 2800], [0.34, 3100], [1.0, 5600]];
  const x = clamp(o2, 0.12, 1);
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, ta] = pts[i], [b, tb] = pts[i + 1];
    if (x <= b) return Math.round(lerp(ta, tb, (x - a) / (b - a)));
  }
  return 5600;
}
const glowForO2 = (o2: number) => clamp(0.35 + 0.65 * ((clamp(o2, 0.12, 1) - 0.12) / 0.88) ** 0.6, 0.35, 1);

export function matchBurnParams(i: BurnInput): BurnParams {
  const particles = i.phone ? 14 : 28;
  const base: BurnParams = {
    mode: 'burning', shape: i.oneG ? 'drop' : 'round', intensity: 0.9, tempK: i.oneG ? 1800 : tempForO2(i.o2), flickerHz: 2.0, flickerAmp: 0.25,
    charCap: 0.9, grayscale: false, flameScale: 1, smoke: i.oneG ? 'up' : 'radial', particles, animate: !i.reducedMotion, lifecycle: true,
  };
  if (i.oneG) return { ...base, intensity: 0.95, flickerHz: 2.6, flickerAmp: 0.35 };          // reference only: no data attached
  if (i.custom == null) {
    if (i.noTests) return { ...base, mode: 'ember', intensity: 0.22, flickerAmp: 0.08, flickerHz: 0.8, charCap: 0.25, particles: 0, lifecycle: false };
    return { ...base, intensity: glowForO2(i.o2) * 1.05 };
  }
  // Custom: the data decides the STATE; this only chooses its look.
  const observed = clamp(0.5 + 0.6 * (i.glow ?? 0.5), 0.5, 1.1);        // same 0.8–1.4 scale idea as the SVG scene, kept in range
  const scale = i.glow == null ? 1 : 0.8 + 0.6 * clamp(i.glow);          // = obsScale() in FlameScene.tsx (data-driven size)
  switch (i.custom) {
    case 'empty': return { ...base, mode: 'none', animate: false };
    case 'out': return { ...base, mode: 'out', intensity: 0, animate: false, lifecycle: false, charCap: 0.5, particles: 0 };
    case 'small_n': return { ...base, intensity: 0.5, grayscale: true, flickerAmp: 0.15, lifecycle: false, charCap: 0.3, particles: 0, flameScale: scale };
    case 'mixed': return { ...base, intensity: observed, flickerHz: 2.4, flickerAmp: 0.6, flameScale: scale };
    default: return { ...base, intensity: observed, flickerAmp: 0.22, flameScale: scale };   // 'stable'
  }
}

export interface Life {
  phase: 'ignition' | 'steady' | 'char' | 'fade';
  u: number;               // seconds into the cycle
  flameEnv: number;        // 0–1.25 flame size/brightness envelope (overshoot at ignition)
  flash: number;           // 0–1 ignition flash
  char: number;            // 0–1 carbonised fraction (before multiplying by charCap)
  alpha: number;           // 0–1 whole-layer opacity: fades in at the start and out at the end, so the restart is not a jump
}
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** The 13 s life of one match: ignition → steady burn → progressive charring → soft fade and restart through a cross-fade. */
export function lifecycle(t: number): Life {
  const u = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S;
  const phase = u < 1.2 ? 'ignition' : u < 3.2 ? 'steady' : u < 11.2 ? 'char' : 'fade';
  const grow = smooth(0, 1.1, u);
  const overshoot = 0.22 * Math.sin(clamp(u / 1.2) * Math.PI);
  const flameEnv = (u < 11.2 ? grow + overshoot : 1 - smooth(11.2, 12.4, u));
  const flash = u < 1.1 ? Math.sin(clamp((u - 0.1) / 0.9) * Math.PI) : 0;
  const char = smooth(1.2, 11.4, u);
  const alpha = smooth(0, 0.7, u) * (1 - smooth(12.2, CYCLE_S, u));
  return { phase, u, flameEnv: clamp(flameEnv, 0, 1.25), flash, char, alpha };
}

/** Life used for a static or non-looping state: the steady frame (still frame when motion is reduced). */
export function heldLife(p: BurnParams): Life {
  const l = lifecycle(STATIC_T);
  return { ...l, alpha: 1, flameEnv: p.mode === 'out' ? 0 : 1, flash: 0, char: p.mode === 'out' ? 1 : l.char };
}
