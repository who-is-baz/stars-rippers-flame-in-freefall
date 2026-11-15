import { describe, expect, it } from 'vitest';
import { diffusionParticles, flameLook, particleCount, risingParticles } from './flameLook';

const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const blueness = (h: string) => { const [r, , b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return b - r; };

describe('flameLook (illustration only)', () => {
  it('~21 % O₂ is a faint warm orange-yellow; ≥30 % is brighter and whiter; 100 % has a white core and a bluish rim', () => {
    const air = flameLook(0.21, 14.7), rich = flameLook(0.32, 10.3), pure = flameLook(1, 4.3);
    expect(air.glow).toBeLessThan(rich.glow);
    expect(rich.glow).toBeLessThan(pure.glow);
    expect(lum(rich.mid)).toBeGreaterThan(lum(air.mid));
    expect(air.mid).toMatch(/^#FF|^#fe|^#ff/i);                 // orange family: red channel at maximum
    expect(pure.core.toLowerCase()).toBe('#ffffff');
    expect(blueness(pure.edge)).toBeGreaterThan(80);            // bluish rim
    expect(blueness(air.edge)).toBeLessThan(0);                 // warm rim
  });
  it('brightness never decreases as O₂ rises', () => {
    let last = -1;
    for (let o2 = 0.12; o2 <= 1.0001; o2 += 0.02) { const g = flameLook(o2, 14.7).glow; expect(g).toBeGreaterThanOrEqual(last); last = g; }
  });
  it('halo is larger at higher pressure and the same inputs always give the same look', () => {
    expect(flameLook(0.21, 29).haloRadius).toBeGreaterThan(flameLook(0.21, 10.2).haloRadius);
    expect(flameLook(0.21, 14.7)).toEqual(flameLook(0.21, 14.7));
  });
  it('clamps out-of-range inputs', () => {
    expect(flameLook(5, 14.7).glow).toBe(1);
    expect(flameLook(0, 0).glow).toBeGreaterThan(0);
  });
  it('more oxygen → more particles; phones get fewer', () => {
    expect(particleCount(0.34, false)).toBeGreaterThan(particleCount(0.21, false));
    expect(particleCount(1, false)).toBeGreaterThan(particleCount(0.34, false));
    expect(particleCount(0.5, true)).toBeLessThan(particleCount(0.5, false));
  });
  it('microgravity particles surround the flame from every direction and move toward it', () => {
    const ps = diffusionParticles(32);
    const quadrants = new Set(ps.map((p) => `${p.x > 800}${p.y > 480}`));
    expect(quadrants.size).toBe(4);
    for (const p of ps) { const d0 = Math.hypot(p.x - 800, p.y - 480), d1 = Math.hypot(p.x + p.dx - 800, p.y + p.dy - 480); expect(d1).toBeLessThan(d0); }
  });
  it('1 g reference particles start below the flame and rise (dy < 0), never from above', () => {
    for (const p of risingParticles(20)) { expect(p.y).toBeGreaterThan(480); expect(p.dy).toBeLessThan(0); }
  });
});
