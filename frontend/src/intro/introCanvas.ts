// Canvas drawing of the opening: black screen, two scrapes of sparks, a small flame on a match head, then a circle of
// light that opens from the centre and lets the real interface show through. Decoration only: no data, no NASA marks.
// Warm palette shared with the scene's match (matchRender.ts: ember 255,120,40 / 200,60,20) and its blue base (#7C96FF).
import { STRIKE_LEN, TL } from './introLogic';

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const fract = (x: number) => x - Math.floor(x);
const rnd = (i: number, k: number) => fract(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOutBack = (p: number) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2);

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  if (r <= 0.5) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Sparks of one scrape: a short streak that moves along the striking line and throws particles.
function strike(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number, age: number, seed: number, strong: boolean) {
  if (age < 0 || age > STRIKE_LEN + 0.45) return 0;
  const p = clamp(age / STRIKE_LEN);
  const hx = cx - 70 * u + 140 * u * p, hy = cy + 26 * u - 40 * u * p;      // the head scraping, lower-left to upper-right
  const live = age <= STRIKE_LEN ? 1 : clamp(1 - (age - STRIKE_LEN) / 0.45);
  const n = strong ? 34 : 22;
  for (let i = 0; i < n; i++) {
    const born = rnd(i, seed) * STRIKE_LEN;
    const a = age - born;
    if (a < 0) continue;
    const lifeSpan = 0.18 + rnd(i, seed + 1) * 0.3;
    const k = 1 - a / lifeSpan;
    if (k <= 0) continue;
    const bp = born / STRIKE_LEN;
    const bx = cx - 70 * u + 140 * u * bp, by = cy + 26 * u - 40 * u * bp;
    const ang = -0.5 + (rnd(i, seed + 2) - 0.5) * 2.2;
    const sp = (120 + rnd(i, seed + 3) * 260) * u;
    const x = bx + Math.cos(ang) * sp * a, y = by + Math.sin(ang) * sp * a + 90 * u * a * a;
    ctx.fillStyle = `rgba(255,${190 + Math.floor(rnd(i, seed + 4) * 60)},${110 + Math.floor(rnd(i, seed + 5) * 90)},${(k * 0.95).toFixed(3)})`;
    const s = (1 + rnd(i, seed + 6) * 1.6) * u * (0.6 + k * 0.6);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  if (age <= STRIKE_LEN) glow(ctx, hx, hy, 26 * u, [[0, `rgba(255,236,190,${0.85 * live})`], [0.4, `rgba(255,150,60,${0.4 * live})`], [1, 'rgba(200,60,20,0)']]);
  return live * (age <= STRIKE_LEN ? 0.5 : 0.25);
}

export function drawIntro(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const cx = w / 2, cy = h / 2;
  const u = clamp(Math.min(w, h) / 760, 0.55, 1.6);                           // scale unit: phone to large desktop
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // ---- circle of light: a hole in the black that shows the real interface ----
  const rp = clamp((t - TL.revealStart) / (TL.revealEnd - TL.revealStart));
  const maxR = Math.hypot(w, h) / 2 * 1.12;
  const R = easeInOut(rp) * maxR;
  if (R > 1) {
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.72, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalCompositeOperation = 'lighter';
  // warm rim of the circle while it travels
  if (R > 1 && rp < 1) {
    const rim = (1 - rp) * 0.5;
    const g = ctx.createRadialGradient(cx, cy, R * 0.66, cx, cy, R * 1.02);
    g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(0.7, `rgba(255,196,128,${rim})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2); ctx.fill();
  }

  // ---- the two scrapes ----
  const l1 = strike(ctx, cx, cy, u, t - TL.strike1, 11, false);
  const l2 = strike(ctx, cx, cy, u, t - TL.strike2, 47, true);

  // ---- flame ----
  const fa = t - TL.ignite;
  let flame = 0;
  if (fa > 0) {
    const born = clamp(easeOutBack(clamp(fa / 0.32)), 0, 1.25);
    const grow = 1 + easeInOut(rp) * 2.6;
    const fade = 1 - clamp((rp - 0.45) / 0.5);                               // hands over to the real scene underneath
    flame = fade;
    const flick = 1 + 0.07 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37 + 1.3);
    const size = 15 * u * born * grow;
    if (fade > 0.01) {
      ctx.globalAlpha = fade;
      // the light it throws
      glow(ctx, cx, cy - size, size * 11, [[0, 'rgba(255,170,80,0.34)'], [0.35, 'rgba(255,120,40,0.12)'], [1, 'rgba(200,60,20,0)']]);
      // blue base, then a tear-drop of stacked warm lobes that narrows upward
      glow(ctx, cx, cy + size * 0.15, size * 1.25, [[0, 'rgba(124,150,255,0.7)'], [1, 'rgba(38,50,79,0)']]);
      for (let j = 0; j < 6; j++) {
        const k = j / 5;
        const sway = Math.sin(t * 9 + j * 0.9) * size * 0.1 * k;
        const y = cy - size * (0.35 + k * 2.3 * flick);
        const r = size * (1.35 - k * 0.85);
        glow(ctx, cx + sway, y, r, [[0, `rgba(255,246,220,${0.9 - k * 0.35})`], [0.45, `rgba(255,198,107,${0.55 - k * 0.2})`], [1, 'rgba(255,120,40,0)']]);
      }
      // flash at the instant it catches
      if (fa < 0.28) glow(ctx, cx, cy, 190 * u * (0.4 + fa * 3), [[0, `rgba(255,244,214,${0.75 * (1 - fa / 0.28)})`], [1, 'rgba(255,150,60,0)']]);
      ctx.globalAlpha = 1;
    }
  }

  // ---- match: head and stick, visible only by the light of the sparks or the flame ----
  const lit = clamp(Math.max(l1, l2, flame * clamp(fa * 6)));
  if (lit > 0.01) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = lit * (1 - clamp((rp - 0.3) / 0.4));
    const sw = 5 * u, sl = 150 * u;
    const g = ctx.createLinearGradient(0, cy, 0, cy + sl);
    g.addColorStop(0, '#3a2414'); g.addColorStop(0.18, '#c98a4b'); g.addColorStop(1, 'rgba(120,78,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - sw / 2, cy + 4 * u, sw, sl);
    ctx.fillStyle = fa > 0 ? '#5a1d12' : '#8b2a1a';
    ctx.beginPath(); ctx.ellipse(cx, cy + 2 * u, 5.5 * u, 8 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}
