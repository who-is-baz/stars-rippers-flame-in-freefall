import { describe, expect, it } from 'vitest';
import type { FlameState } from './explorer';
import { CYCLE_S, STATIC_T, heldLife, lifecycle, matchBurnParams, tempForO2, type BurnInput } from './matchBurn';

const input = (p: Partial<BurnInput> = {}): BurnInput => ({ custom: null, glow: null, o2: 0.21, psi: 14.7, noTests: false, oneG: false, reducedMotion: false, phone: false, ...p });

describe('match burn parameters', () => {
  it('scenarios with tests burn actively, microgravity: round flame and radial smoke', () => {
    const p = matchBurnParams(input());
    expect(p).toMatchObject({ mode: 'burning', shape: 'round', smoke: 'radial', animate: true, lifecycle: true, grayscale: false });
    expect(p.intensity).toBeGreaterThan(0.5);
  });
  it('colour: ~21 % warm orange, ≥30 % yellow-white, 100 % white with a blue rim (temperature rises with O₂)', () => {
    const t21 = tempForO2(0.21), t30 = tempForO2(0.3), t100 = tempForO2(1);
    expect(t21).toBeLessThan(t30); expect(t30).toBeLessThan(t100);
    expect(t21).toBeLessThanOrEqual(2200); expect(t100).toBeGreaterThanOrEqual(5000);
    expect(matchBurnParams(input({ o2: 0.34 })).intensity).toBeGreaterThan(matchBurnParams(input({ o2: 0.21 })).intensity);
  });
  it('no matching tests → faint ember, no strong animation, no particles', () => {
    const p = matchBurnParams(input({ noTests: true }));
    expect(p).toMatchObject({ mode: 'ember', lifecycle: false, particles: 0 });
    expect(p.intensity).toBeLessThan(0.3); expect(p.flickerAmp).toBeLessThan(0.15);
  });
  it('1 g reference: rising teardrop and rising smoke, whatever the data state', () => {
    const p = matchBurnParams(input({ oneG: true, custom: 'out' as FlameState }));
    expect(p).toMatchObject({ shape: 'drop', smoke: 'up', mode: 'burning' });
    expect(p.tempK).toBeLessThan(2200);                         // red-orange, not the atmosphere's colour
  });
  it('reduced motion: not animated (one still frame)', () => {
    expect(matchBurnParams(input({ reducedMotion: true })).animate).toBe(false);
  });
  it('phones get fewer particles', () => {
    expect(matchBurnParams(input({ phone: true })).particles).toBeLessThan(matchBurnParams(input()).particles);
  });
});

describe('Custom keeps its data logic (the state comes from the data; only the look is chosen here)', () => {
  const c = (custom: FlameState, glow: number | null = 0.5, extra: Partial<BurnInput> = {}) => matchBurnParams(input({ custom, glow, ...extra }));
  it('all extinguished → no flame, static ember', () => {
    expect(c('out')).toMatchObject({ mode: 'out', intensity: 0, animate: false, lifecycle: false });
  });
  it('n < 5 → grey flame, no lifecycle loop, no extinguish animation', () => {
    expect(c('small_n')).toMatchObject({ mode: 'burning', grayscale: true, lifecycle: false });
  });
  it('mixed → strong irregular flicker; stable → calm', () => {
    expect(c('mixed').flickerAmp).toBeGreaterThan(c('stable').flickerAmp * 2);
  });
  it('empty → nothing drawn (the hatch of the SVG scene stays)', () => {
    expect(c('empty').mode).toBe('none');
  });
  it('intensity and size follow the OBSERVED glow on the fixed scale, never the colour of the atmosphere', () => {
    expect(c('stable', 0.9).intensity).toBeGreaterThan(c('stable', 0.1).intensity);
    expect(c('stable', 0.9).flameScale).toBeGreaterThan(c('stable', 0.1).flameScale);
    expect(c('stable', 0.5, { o2: 0.21 }).intensity).toBe(c('stable', 0.5, { o2: 1 }).intensity);     // O₂ only changes the colour in Custom
    expect(c('stable', 0.5, { o2: 0.21 }).tempK).not.toBe(c('stable', 0.5, { o2: 1 }).tempK);
  });
});

describe('lifecycle (13 s, no abrupt cut)', () => {
  const samples = Array.from({ length: 1301 }, (_, i) => lifecycle(i / 100));
  it('starts and ends invisible, so the restart is a cross-fade, not a jump', () => {
    expect(lifecycle(0).alpha).toBe(0);
    expect(lifecycle(CYCLE_S - 1e-6).alpha).toBeLessThan(0.01);
    expect(lifecycle(CYCLE_S).alpha).toBe(0);
  });
  it('phases in order: ignition → steady → char → fade', () => {
    expect([0.5, 2, 6, 12].map((t) => lifecycle(t).phase)).toEqual(['ignition', 'steady', 'char', 'fade']);
  });
  it('ignition flash is brief; the flame envelope grows then fades smoothly', () => {
    expect(lifecycle(0.6).flash).toBeGreaterThan(0.9); expect(lifecycle(3).flash).toBe(0);
    expect(lifecycle(6).flameEnv).toBe(1); expect(lifecycle(12.8).flameEnv).toBe(0);
  });
  it('carbonisation only advances during the cycle (monotonic) and reaches 1 near the end', () => {
    const ch = samples.slice(0, 1300).map((s) => s.char);   // stop before the wrap at 13 s
    for (let i = 1; i < ch.length; i++) expect(ch[i]).toBeGreaterThanOrEqual(ch[i - 1] - 1e-12);
    expect(lifecycle(11.4).char).toBe(1);
  });
  it('no sample-to-sample jump in alpha, flame or char (10 ms steps) except the wrap, where alpha is 0', () => {
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i].alpha - samples[i - 1].alpha)).toBeLessThan(0.05);
      if (i < samples.length - 1) { expect(Math.abs(samples[i].flameEnv - samples[i - 1].flameEnv)).toBeLessThan(0.08); expect(Math.abs(samples[i].char - samples[i - 1].char)).toBeLessThan(0.05); }
    }
    expect(lifecycle(CYCLE_S + 3)).toEqual({ ...lifecycle(3), u: lifecycle(3).u });
  });
  it('held (still) frame: fully visible steady flame, or an extinguished stick in the "out" state', () => {
    const live = heldLife(matchBurnParams(input()));
    expect(live).toMatchObject({ alpha: 1, flameEnv: 1, flash: 0 });
    expect(lifecycle(STATIC_T).phase).toBe('char');
    expect(heldLife(matchBurnParams(input({ custom: 'out' }))).flameEnv).toBe(0);
  });
});
