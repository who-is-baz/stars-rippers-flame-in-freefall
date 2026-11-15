// Procedural renderer of the match stick and its flame (canvas 2D, no external images or textures).
// A CONCEPTUAL ILLUSTRATION: nothing here is a measurement or a combustion simulation. Coordinates are scene units; the canvas
// covers the scene region x 300–1300, y 130–830, so the flame centre (800, 480) is (500, 350) and the match head (800, 494) is (500, 364).
import { lifecycle, heldLife, type BurnParams, type Life } from '../lib/matchBurn';

export const REGION = { x: 300, y: 130, w: 1000, h: 700 };
const FX = 500, FY = 350, HEAD_Y = 364, STICK_END = 630;
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const fract = (x: number) => x - Math.floor(x);
const rnd = (i: number, k: number) => fract(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);

// ---- fbm value noise (one tile, built once) ----
const N = 128;
let tile: Float32Array | null = null;
function makeTile() {
  const g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = rnd(i, 7);
  tile = g; return g;
}
function vnoise(g: Float32Array, x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = g[((yi & 127) << 7) | (xi & 127)], b = g[((yi & 127) << 7) | ((xi + 1) & 127)];
  const c = g[(((yi + 1) & 127) << 7) | (xi & 127)], d = g[(((yi + 1) & 127) << 7) | ((xi + 1) & 127)];
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function fbm(g: Float32Array, x: number, y: number, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let o = 0; o < oct; o++) { s += amp * vnoise(g, x * f, y * f); f *= 2.03; amp *= 0.5; }
  return s;     // ≈ 0–1
}

/** Approximate blackbody colour (Tanner Helland fit) for t in kelvin; below ~1000 K fades to dark red. */
export function blackbody(tK: number): [number, number, number] {
  const t = clamp(tK, 1000, 12000) / 100;
  const r = t <= 66 ? 255 : clamp(329.7 * Math.pow(t - 60, -0.1332), 0, 255);
  const g = t <= 66 ? clamp(99.47 * Math.log(t) - 161.1, 0, 255) : clamp(288.1 * Math.pow(t - 60, -0.0755), 0, 255);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : clamp(138.5 * Math.log(t - 10) - 305, 0, 255);
  return [r, g, b];
}

export class MatchRenderer {
  private g = tile ?? makeTile();
  constructor(private ctx: CanvasRenderingContext2D, private p: BurnParams) {}
  setParams(p: BurnParams) { this.p = p; }

  draw(t: number, oneG: boolean) {
    const { ctx, p } = this;
    const life = p.animate && p.lifecycle ? lifecycle(t) : heldLife(p);
    const tt = p.animate ? t : 6.5;
    ctx.clearRect(0, 0, REGION.w, REGION.h);
    if (p.mode === 'none') return;
    ctx.globalAlpha = life.alpha;
    const flick = Math.sin(tt * 6.283 * p.flickerHz) * 0.6 + Math.sin(tt * 6.283 * p.flickerHz * 2.7 + 1.3) * 0.4;
    const burning = p.mode === 'burning' && life.flameEnv > 0.01;
    const char = clamp(life.char * p.charCap + (p.mode === 'out' ? 0.5 : 0));
    this.smoke(tt, life, oneG, burning);
    this.stick(tt, char, burning, flick);
    if (p.mode === 'ember') this.emberGlow(tt, 1); else if (p.mode === 'out') this.emberGlow(tt, 0.35);
    this.sparksAsh(tt, life, oneG, char, burning);
    ctx.globalAlpha = 1;
  }

  private emberGlow(t: number, k: number) {
    const ctx = this.ctx, pulse = 0.65 + 0.35 * Math.sin(t * 2.1 + 0.4);
    const grd = ctx.createRadialGradient(FX, HEAD_Y, 0, FX, HEAD_Y, 34);
    grd.addColorStop(0, `rgba(255,120,40,${0.55 * pulse * k})`); grd.addColorStop(1, 'rgba(200,60,20,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = grd; ctx.fillRect(FX - 40, HEAD_Y - 40, 80, 80); ctx.restore();
  }

  private stick(t: number, char: number, burning: boolean, flick: number) {
    const { ctx, p } = this, g = this.g;
    const x0 = FX - 4, top = HEAD_Y + 4, L = STICK_END - top, cl = L * char * 0.75;
    // wood body with vertical grain
    const wood = ctx.createLinearGradient(x0, 0, x0 + 8, 0);
    wood.addColorStop(0, '#8A5C33'); wood.addColorStop(0.45, '#D2A46C'); wood.addColorStop(1, '#7E5230');
    ctx.fillStyle = wood; ctx.fillRect(x0, top, 8, L);
    ctx.fillStyle = 'rgba(70,40,18,0.35)';
    for (let k = 0; k < 7; k++) { const gx = x0 + 0.8 + rnd(k, 3) * 6.4; ctx.fillRect(gx, top, 0.6, L); }
    for (let y = top + 6; y < STICK_END; y += 11) ctx.fillRect(x0 + rnd(y, 5) * 5, y, 2 + rnd(y, 9) * 3, 0.7);
    // char: dark, cracked, with a jagged edge
    if (cl > 1) {
      const cg = ctx.createLinearGradient(0, top, 0, top + cl);
      cg.addColorStop(0, '#1a120d'); cg.addColorStop(1, '#4a3322');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(x0 - 0.6, top);
      for (let k = 0; k <= 8; k++) ctx.lineTo(x0 - 0.6 + (k / 8) * 9.2, top + cl + (fbm(g, k * 0.9, 3.3, 2) - 0.5) * 9);
      ctx.lineTo(x0 + 8.6, top); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let y = top + 4; y < top + cl - 3; y += 7) ctx.fillRect(x0 + rnd(y, 11) * 6, y, 1, 3 + rnd(y, 13) * 4);      // cracks
      // ember front
      const live = burning || p.mode === 'ember';
      if (live) {
        const a = clamp(0.55 + 0.35 * flick + 0.2 * Math.sin(t * 9)) * (burning ? 1 : 0.6);
        const ey = top + cl;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const eg = ctx.createRadialGradient(FX, ey, 0, FX, ey, 14);
        eg.addColorStop(0, `rgba(255,150,40,${a})`); eg.addColorStop(1, 'rgba(255,80,10,0)');
        ctx.fillStyle = eg; ctx.fillRect(FX - 16, ey - 16, 32, 32); ctx.restore();
      }
    }
    // head: a SOLID red-brown bulb with a highlight and an ember rim while it burns
    const lit = burning ? clamp(1 - char * 1.6) : p.mode === 'ember' ? 0.5 : 0;
    const hg = ctx.createRadialGradient(FX - 3, HEAD_Y - 8, 1, FX, HEAD_Y - 2, 15);
    if (char > 0.12) { hg.addColorStop(0, '#3a2a22'); hg.addColorStop(1, '#0f0a08'); }
    else { hg.addColorStop(0, '#C2563A'); hg.addColorStop(0.5, '#8E301C'); hg.addColorStop(1, '#4A160C'); }
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(FX, HEAD_Y - 2, 11, 14, 0, 0, 6.283); ctx.fill();
    if (lit > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,${Math.round(120 + 60 * flick)},40,${0.85 * lit})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(FX, HEAD_Y - 2, 10.5, 13.5, 0, 0, 6.283); ctx.stroke(); ctx.restore();
    }
    if (char < 0.12) { ctx.fillStyle = 'rgba(255,225,200,0.35)'; ctx.beginPath(); ctx.ellipse(FX - 4, HEAD_Y - 8, 3, 4.5, -0.4, 0, 6.283); ctx.fill(); }
  }

  private smoke(t: number, life: Life, oneG: boolean, burning: boolean) {
    const { ctx, p } = this;
    if (!burning || p.particles === 0) return;
    const n = Math.round(p.particles * 0.5);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const lifeS = 6 + rnd(i, 1) * 4, ph = fract(t / lifeS + rnd(i, 2));
      const a = 0.11 * Math.sin(Math.PI * ph) * life.flameEnv * p.intensity;
      if (a < 0.004) continue;
      let x: number, y: number;
      if (oneG) { x = FX + Math.sin(ph * 6 + i) * (14 + ph * 26) + (rnd(i, 3) - 0.5) * 18; y = FY - 40 - ph * 260; }
      else { const th = rnd(i, 4) * 6.283, r = 70 + ph * (150 + rnd(i, 5) * 40); x = FX + Math.cos(th) * r; y = FY + Math.sin(th) * r; }
      const rad = 8 + ph * 26;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(190,190,196,${a})`); grd.addColorStop(1, 'rgba(190,190,196,0)');
      ctx.fillStyle = grd; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.restore();
  }

  private sparksAsh(t: number, life: Life, oneG: boolean, char: number, burning: boolean) {
    const { ctx, p } = this;
    if (p.particles === 0) return;
    ctx.save();
    // sparks: a burst at ignition and a few from the ember front while charring
    if (burning) {
      const cl = (STICK_END - HEAD_Y) * char * 0.75, ey = HEAD_Y + 4 + cl;
      ctx.globalCompositeOperation = 'lighter';
      const bursts = Math.round(p.particles * 0.35);
      for (let i = 0; i < bursts; i++) {
        const lifeS = 0.9 + rnd(i, 21) * 0.7, per = 3.2 + rnd(i, 22) * 2.5, ph = fract((t + rnd(i, 23) * per) / per) * per / lifeS;
        const ign = life.u < 1.6 && life.phase !== 'fade';
        if (ph > 1 || (!ign && rnd(i, 24) < 0.5)) continue;
        const th = rnd(i, 25) * 6.283, sp = 40 + rnd(i, 26) * 70;
        const ox = ign ? FX : FX, oy = ign ? FY : ey;
        const x = ox + (oneG ? Math.cos(th) * sp * 0.4 : Math.cos(th) * sp) * ph, y = oy + (oneG ? -Math.abs(Math.sin(th)) * sp * 1.2 : Math.sin(th) * sp) * ph;
        ctx.fillStyle = `rgba(255,${Math.round(190 - 90 * ph)},70,${(1 - ph) * 0.9})`; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    // ash: grey flakes that leave the charred stick (drift outward in microgravity, fall in 1 g)
    if (char > 0.08) {
      ctx.globalCompositeOperation = 'source-over';
      const n = Math.round(p.particles * 0.3), cl = (STICK_END - HEAD_Y) * char * 0.75, ey = HEAD_Y + 4 + cl;
      for (let i = 0; i < n; i++) {
        const lifeS = 3.5 + rnd(i, 31) * 3, ph = fract(t / lifeS + rnd(i, 32));
        const side = rnd(i, 33) < 0.5 ? -1 : 1, drift = 10 + rnd(i, 34) * 50;
        const x = FX + side * (6 + drift * ph), y = oneG ? ey + ph * 90 : ey - 10 + (rnd(i, 35) - 0.5) * 40 * ph + ph * 6;
        ctx.fillStyle = `rgba(120,116,112,${0.55 * Math.sin(Math.PI * ph)})`; ctx.fillRect(x, y, 1.6, 1.2);
      }
    }
    ctx.restore();
  }
}
