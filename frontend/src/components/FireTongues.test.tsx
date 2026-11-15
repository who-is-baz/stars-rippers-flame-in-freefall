import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { flameLook } from '../lib/flameLook';
import { FireTongues, fireCounts, fireTongues, lobePath, type FireProps } from './FlameArt';

const base: FireProps = { look: flameLook(0.21, 14.7), oneG: false, scale: 1, mode: 'burning', grayscale: false, strong: false, intensity: 0.9, lifecycle: true, animated: true, paused: false, phone: false };
const norm = (r: number) => ((r % 360) + 360) % 360;

describe('fire layer (round-tipped lobes, not a star)', () => {
  it('microgravity: lobes spread all around the head (no preferred direction), short and broad, in both layers', () => {
    for (const layer of ['outer', 'inner'] as const) {
      const l = fireTongues(layer === 'outer' ? 7 : 5, false, layer), rots = l.map((t) => norm(t.rot));
      expect(Math.max(...rots) - Math.min(...rots)).toBeGreaterThan(250);
      expect(Math.max(...l.map((t) => t.len))).toBeLessThan(130);            // was up to 144 and needle-thin: read as a star
      expect(Math.min(...l.map((t) => t.w / t.len))).toBeGreaterThan(0.3);   // broad (old spikes were ≈ 0.1–0.25), not needle-like
    }
    // no upward bias: the mean direction vector of all lobes is short compared with one lobe
    const all = [...fireTongues(7, false, 'outer'), ...fireTongues(5, false, 'inner')];
    const vx = all.reduce((s, t) => s + Math.sin((t.rot * Math.PI) / 180), 0) / all.length;
    const vy = all.reduce((s, t) => s - Math.cos((t.rot * Math.PI) / 180), 0) / all.length;
    expect(Math.hypot(vx, vy)).toBeLessThan(0.35);
  });

  it('microgravity: no star symmetry, lengths, widths and angles vary a little (deterministic)', () => {
    const l = fireTongues(7, false, 'outer');
    expect(new Set(l.map((t) => t.len.toFixed(1))).size).toBe(l.length);
    expect(new Set(l.map((t) => t.w.toFixed(1))).size).toBe(l.length);
    const gaps = l.map((t, i) => norm(l[(i + 1) % l.length].rot - t.rot));
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(5);
    expect(fireTongues(7, false, 'outer')).toEqual(l);
  });

  it('every lobe tip is rounded (horizontal tangent at the top), never a sharp point', () => {
    const d = lobePath(60, 25, 0, 0.62);
    const m = d.match(/C(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/)!;
    expect(Number(m[4])).toBe(Number(m[6]));                                   // control point at the same height as the tip
    expect(Math.abs(Number(m[3]) - Number(m[5]))).toBeGreaterThan(5);           // and offset sideways: a dome
  });

  it('1 g reference: lobes cluster upward and are longer (candle tear-drop)', () => {
    const l = [...fireTongues(4, true, 'outer'), ...fireTongues(3, true, 'inner')];
    expect(l.every((t) => Math.abs(t.rot) <= 45)).toBe(true);
    expect(Math.max(...l.map((t) => t.len))).toBeGreaterThan(Math.max(...fireTongues(7, false).map((t) => t.len)) * 0.9);
  });

  it('renders 12 lobes on a desktop, fewer on a phone, 5 faint ones as an ember; nothing when out/none', () => {
    const n = (p: Partial<FireProps>) => render(<svg><FireTongues {...base} {...p} /></svg>).container.querySelector('[data-tongues]')?.getAttribute('data-tongues') ?? null;
    const c = fireCounts(false, false, false);
    expect(n({})).toBe(String(c.outer + c.inner)); expect(n({})).toBe('12');
    expect(Number(n({ phone: true }))).toBeLessThan(12); expect(n({ mode: 'ember' })).toBe('5');
    expect(n({ mode: 'out' })).toBeNull(); expect(n({ mode: 'none' })).toBeNull();
  });

  it('microgravity draws a luminous sphere; the 1 g reference does not', () => {
    expect(render(<svg><FireTongues {...base} /></svg>).container.querySelector('[data-part="fire-sphere"]')).not.toBeNull();
    expect(render(<svg><FireTongues {...base} oneG /></svg>).container.querySelector('[data-part="fire-sphere"]')).toBeNull();
  });

  it('ember is fainter than a burning flame', () => {
    const op = (p: Partial<FireProps>) => Number((render(<svg><FireTongues {...base} {...p} /></svg>).container.querySelector('.fire') as SVGElement).style.opacity);
    expect(op({ mode: 'ember' })).toBeLessThan(op({}));
  });

  it('reduced motion: the lobes stay in a fixed position (no animation classes)', () => {
    const { container } = render(<svg><FireTongues {...base} animated={false} /></svg>);
    expect(container.querySelector('.ft')).toBeNull(); expect(container.querySelector('.fire-life')).toBeNull();
    expect(container.querySelector('.fire-sphere')).toBeNull();
  });

  it('uses additive-style blending and no filters', () => {
    const { container } = render(<svg><FireTongues {...base} /></svg>);
    expect((container.querySelector('.fire') as SVGElement).style.mixBlendMode).toBe('screen');
    expect(container.querySelector('filter, feTurbulence, feGaussianBlur')).toBeNull();
  });
});
