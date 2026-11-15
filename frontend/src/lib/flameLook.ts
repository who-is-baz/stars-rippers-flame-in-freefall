// Atmosphere → ILLUSTRATIVE flame appearance. Pure functions, no data: colour and glow are an aesthetic of the O₂ level
// (warm and dim near air, brighter and whiter above 30 %, white core with a bluish rim at 100 %); halo size and density
// follow pressure. It is NOT a combustion simulation and it is never read as a measurement: in the Custom explorer the
// size and brightness come from the observed burning rate (lib/explorer.ts), and this module only supplies the colours.
// All real tests are microgravity, where the flame is round and faint and oxygen arrives by diffusion from every direction.

export interface FlameLook {
  core: string; mid: string; edge: string;   // radial gradient stops, centre → rim
  glow: number;                              // 0–1 aesthetic brightness (halo opacity, core size)
  haloRadius: number;                        // SVG units around the flame (chamber radius is 280)
  haloOpacity: number;
  particles: number;                         // number of oxygen particles on a desktop screen
  label: string;                             // short caption of the look, e.g. "warm, faint"
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t) as RGB); };
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// O₂ anchors (fraction): colours of the three gradient stops and the aesthetic glow at that level.
const ANCHORS: { o2: number; core: string; mid: string; edge: string; glow: number; label: string }[] = [
  { o2: 0.12, core: '#FFE2B0', mid: '#E8803A', edge: '#7A3318', glow: 0.18, label: 'warm, faint' },
  { o2: 0.21, core: '#FFE9B8', mid: '#FF9D4D', edge: '#8A4420', glow: 0.3, label: 'warm, faint' },
  { o2: 0.30, core: '#FFFBE8', mid: '#FFD36B', edge: '#FF9D4D', glow: 0.6, label: 'brighter, white-yellow' },
  { o2: 0.34, core: '#FFFDF0', mid: '#FFE184', edge: '#FFAE55', glow: 0.68, label: 'brighter, white-yellow' },
  { o2: 1.0, core: '#FFFFFF', mid: '#F2F6FF', edge: '#6F8CFF', glow: 1.0, label: 'white core, bluish rim' },
];

export function flameLook(o2: number, psi: number): FlameLook {
  const x = clamp(o2, ANCHORS[0].o2, 1);
  let i = 0;
  while (i < ANCHORS.length - 2 && x > ANCHORS[i + 1].o2) i += 1;
  const a = ANCHORS[i], b = ANCHORS[i + 1];
  const t = clamp((x - a.o2) / (b.o2 - a.o2), 0, 1);
  const glow = a.glow + (b.glow - a.glow) * t;
  const p = clamp(psi / 14.7, 0.3, 3); // 1 = one atmosphere
  return {
    core: mix(a.core, b.core, t), mid: mix(a.mid, b.mid, t), edge: mix(a.edge, b.edge, t), glow,
    haloRadius: Math.round(140 + 60 * Math.pow(p, 0.6)),
    haloOpacity: +(0.1 + 0.22 * glow * clamp(0.6 + 0.4 * p, 0.7, 1.4)).toFixed(3),
    particles: particleCount(o2, false),
    label: t < 0.5 ? a.label : b.label,
  };
}

/** More oxygen → more particles; fewer on phones. Between 8 and 40. */
export function particleCount(o2: number, mobile: boolean): number {
  const n = Math.round(8 + 32 * clamp((o2 - 0.12) / 0.88, 0, 1));
  return mobile ? Math.max(6, Math.round(n / 2)) : n;
}

export interface Particle { x: number; y: number; dx: number; dy: number; r: number; dur: number; delay: number }
const CX = 800, CY = 480;

/** Microgravity: particles start all around the flame and drift toward it (diffusion, no preferred direction). */
export function diffusionParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const th = (i * 137.508 * Math.PI) / 180;            // golden angle: even spread, deterministic
    const r0 = 215 + ((i * 53) % 55);
    const dur = 9 + ((i * 7) % 5);
    return { x: CX + r0 * Math.cos(th), y: CY + r0 * Math.sin(th), dx: -Math.cos(th) * (r0 - 135), dy: -Math.sin(th) * (r0 - 135),
      r: 1.5 + (i % 3) * 0.5, dur, delay: -((i * 1.7) % dur) };
  });
}

/** 1 g reference: air rises from below toward the base of the flame (buoyancy), never from above. */
export function risingParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const side = ((i * 37) % 11) - 5;                     // -5…5
    const x = CX + side * 26, y = 575 + ((i * 29) % 110);
    const dur = 6 + ((i * 5) % 4);
    return { x, y, dx: (CX - x) * 0.85, dy: -(y - 520), r: 1.5 + (i % 3) * 0.5, dur, delay: -((i * 1.3) % dur) };
  });
}
