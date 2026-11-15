import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { flameLook } from '../lib/flameLook';
import { FireTongues, fireTongues, type FireProps } from './FlameArt';

const base: FireProps = { look: flameLook(0.21, 14.7), oneG: false, scale: 1, mode: 'burning', grayscale: false, strong: false, intensity: 0.9, lifecycle: true, animated: true, paused: false, phone: false };

describe('fire tongues layer', () => {
  it('microgravity: tongues spread all around the head (no preferred direction), short', () => {
    const l = fireTongues(9, false), rots = l.map((t) => ((t.rot % 360) + 360) % 360);
    expect(Math.max(...rots) - Math.min(...rots)).toBeGreaterThan(250);
    expect(Math.max(...l.map((t) => t.len))).toBeLessThan(160);
  });
  it('1 g reference: tongues cluster upward and are longer', () => {
    const l = fireTongues(8, true);
    expect(l.every((t) => Math.abs(t.rot) <= 45)).toBe(true);
    expect(Math.max(...l.map((t) => t.len))).toBeGreaterThan(Math.max(...fireTongues(8, false).map((t) => t.len)) * 0.9);
  });
  it('renders 9 tongues on a desktop, fewer on a phone, 4 faint ones as an ember; nothing when out/none', () => {
    const n = (p: Partial<FireProps>) => render(<svg><FireTongues {...base} {...p} /></svg>).container.querySelector('[data-tongues]')?.getAttribute('data-tongues') ?? null;
    expect(n({})).toBe('9'); expect(Number(n({ phone: true }))).toBeLessThan(9); expect(n({ mode: 'ember' })).toBe('4');
    expect(n({ mode: 'out' })).toBeNull(); expect(n({ mode: 'none' })).toBeNull();
  });
  it('reduced motion: the tongues stay in a fixed position (no animation classes)', () => {
    const { container } = render(<svg><FireTongues {...base} animated={false} /></svg>);
    expect(container.querySelector('.ft')).toBeNull(); expect(container.querySelector('.fire-life')).toBeNull();
  });
  it('uses additive-style blending and no filters', () => {
    const { container } = render(<svg><FireTongues {...base} /></svg>);
    expect((container.querySelector('.fire') as SVGElement).style.mixBlendMode).toBe('screen');
    expect(container.querySelector('filter, feTurbulence, feGaussianBlur')).toBeNull();
  });
});
