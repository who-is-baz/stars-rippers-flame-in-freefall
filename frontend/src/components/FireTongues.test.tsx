import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { flameLook } from '../lib/flameLook';
import { FireTongues, fireCounts, fireTongues, flamePath, type FireProps } from './FlameArt';

const base: FireProps = { look: flameLook(0.21, 14.7), oneG: false, scale: 1, mode: 'burning', grayscale: false, strong: false, intensity: 0.9, lifecycle: true, animated: true, paused: false, phone: false };
const norm = (r: number) => ((r % 360) + 360) % 360;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const count = (p: Partial<FireProps>) => render(<svg><FireTongues {...base} {...p} /></svg>).container.querySelector('[data-tongues]')?.getAttribute('data-tongues') ?? null;

describe('fire layer: a corona of flame tongues around a luminous sphere (not a star, flower or atom)', () => {
  it('microgravity: tongues spread all around the sphere (no preferred direction), in both rings', () => {
    const c = fireCounts(false, false, false);
    for (const [layer, n] of [['outer', c.outer], ['inner', c.inner]] as const) {
      const rots = fireTongues(n, false, layer).map((t) => norm(t.rot));
      expect(Math.max(...rots) - Math.min(...rots)).toBeGreaterThan(250);
    }
    const all = [...fireTongues(c.outer, false, 'outer'), ...fireTongues(c.inner, false, 'inner')];
    const vx = all.reduce((s, t) => s + Math.sin((t.rot * Math.PI) / 180), 0) / all.length;
    const vy = all.reduce((s, t) => s - Math.cos((t.rot * Math.PI) / 180), 0) / all.length;
    expect(Math.hypot(vx, vy)).toBeLessThan(0.2);                       // no upward (or any) bias
  });

  it('microgravity: at least 14 short tongues of similar size (no single long one sticking out)', () => {
    const c = fireCounts(false, false, false);
    expect(c.outer + c.inner).toBeGreaterThanOrEqual(14);
    const outer = fireTongues(c.outer, false, 'outer');
    const lens = outer.map((t) => t.len);
    expect(Math.max(...lens)).toBeLessThan(90);                           // short (the old star spikes reached 144)
    expect(Math.max(...lens) / Math.min(...lens)).toBeLessThan(1.4);     // similar sizes
    expect(Math.min(...outer.map((t) => t.w / t.len))).toBeGreaterThan(0.25); // broad base, not needle-like
  });

  it('no rosette: the two rings have no common rotational symmetry and the angles are slightly irregular', () => {
    for (const phone of [false, true]) {
      const c = fireCounts(false, phone, false);
      expect(c.outer).not.toBe(c.inner);
      expect(gcd(c.outer, c.inner)).toBe(1);
    }
    const l = fireTongues(15, false, 'outer');
    const gaps = l.map((t, i) => norm(l[(i + 1) % l.length].rot - t.rot));
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(4);
    expect(new Set(l.map((t) => t.len.toFixed(1))).size).toBe(l.length);
    expect(new Set(l.map((t) => Math.sign(t.lean))).size).toBe(2);       // they lean both ways, not a pinwheel
    expect(fireTongues(15, false, 'outer')).toEqual(l);                   // deterministic
  });

  it('each tongue is flame-shaped: wide rounded base, tip narrower than the base and curled to one side', () => {
    const d = flamePath(60, 20, 9);
    const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    expect(nums[0]).toBe(-20);                                            // base half-width
    const tipX = nums[6], tipY = nums[7];
    expect(tipY).toBe(-60);
    expect(tipX).toBe(9);                                                 // curled sideways
    for (const t of fireTongues(15, false, 'outer')) expect(Math.abs(t.skew)).toBeGreaterThan(0.4 * t.w);
  });

  it('1 g reference: tongues cluster upward and are longer (candle tear-drop)', () => {
    const l = [...fireTongues(4, true, 'outer'), ...fireTongues(3, true, 'inner')];
    expect(l.every((t) => Math.abs(t.rot) <= 45)).toBe(true);
    expect(Math.max(...l.map((t) => t.len))).toBeGreaterThan(Math.max(...fireTongues(15, false).map((t) => t.len)) * 0.9);
  });

  it('renders 22 tongues on a desktop, fewer on a phone, a few faint ones as an ember; nothing when out/none', () => {
    const c = fireCounts(false, false, false);
    expect(count({})).toBe(String(c.outer + c.inner)); expect(count({})).toBe('22');
    expect(Number(count({ phone: true }))).toBeLessThan(22);
    expect(Number(count({ mode: 'ember' }))).toBeLessThan(22);
    expect(count({ mode: 'out' })).toBeNull(); expect(count({ mode: 'none' })).toBeNull();
  });

  it('microgravity draws a luminous sphere and a breathing outer shell; the 1 g reference does not', () => {
    const micro = render(<svg><FireTongues {...base} /></svg>).container;
    expect(micro.querySelector('[data-part="fire-sphere"]')).not.toBeNull();
    expect(micro.querySelector('[data-part="fire-shell"].fire-shell')).not.toBeNull();
    const oneG = render(<svg><FireTongues {...base} oneG /></svg>).container;
    expect(oneG.querySelector('[data-part="fire-sphere"]')).toBeNull();
    expect(oneG.querySelector('[data-part="fire-shell"]')).toBeNull();
  });

  it('ember is fainter than a burning flame', () => {
    const op = (p: Partial<FireProps>) => Number((render(<svg><FireTongues {...base} {...p} /></svg>).container.querySelector('.fire') as SVGElement).style.opacity);
    expect(op({ mode: 'ember' })).toBeLessThan(op({}));
  });

  it('reduced motion: the tongues stay in a fixed position (no animation classes)', () => {
    const { container } = render(<svg><FireTongues {...base} animated={false} /></svg>);
    expect(container.querySelector('.ft')).toBeNull(); expect(container.querySelector('.fire-life')).toBeNull();
    expect(container.querySelector('.fire-sphere')).toBeNull(); expect(container.querySelector('.fire-shell')).toBeNull();
  });

  it('uses additive-style blending and no filters', () => {
    const { container } = render(<svg><FireTongues {...base} /></svg>);
    expect((container.querySelector('.fire') as SVGElement).style.mixBlendMode).toBe('screen');
    expect(container.querySelector('filter, feTurbulence, feGaussianBlur')).toBeNull();
  });
});
