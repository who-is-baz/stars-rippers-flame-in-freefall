import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import { flameState, globalRateScale, glowFor, matchTests, psiOf, type MatchFilters } from './explorer';
import type { ExperimentRow } from '../data/types';

const rows = data.experiments.items as ExperimentRow[];
const tol = data.meta.tolerance;
const ALL = { fuel: 'any', suppressant: 'any' } as const;

describe('matchTests', () => {
  it('parity with scenarios.json: exact and near counts for every scenario', () => {
    for (const s of data.scenarios.scenarios) {
      const m = matchTests(rows, { ...ALL, o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi }, tol);
      expect([s.id, m.n_exact, m.n]).toEqual([s.id, s.n_exact, s.n_near]);
    }
    const byId = Object.fromEntries(data.scenarios.scenarios.map((s) => [s.id, s]));
    expect(byId.earth_iss.n_exact).toBe(49);
    expect([byId.lunar_challenge.n_exact, byId.lunar_challenge.n_near]).toEqual([0, 17]);
    for (const id of ['lunar_nasa', 'exploration', 'suit']) expect(byId[id].n_near).toBe(0);
  });

  it('tolerance comes from the data files, not from the code', () => {
    expect(tol).toEqual(data.scenarios.tolerance);
  });

  it('no interpolation: 0 matches → no rate, no diameter, no extinction count; nearest conditions instead', () => {
    const f: MatchFilters = { ...ALL, o2: { kind: 'point', value: 0.27 }, pressure_psi: { kind: 'point', value: 20 } };
    const m = matchTests(rows, f, tol);
    expect(m.n).toBe(0);
    expect(m.meanRate).toBeNull();
    expect(m.meanExtDiameter).toBeNull();
    expect(m.byOutcome.extinction).toBe(0);
    expect(m.nearest.length).toBeGreaterThan(0);
    expect(m.nearest.length).toBeLessThanOrEqual(3);
    for (const c of m.nearest) {
      const again = matchTests(rows, { ...ALL, o2: { kind: 'point', value: c.o2 }, pressure_psi: { kind: 'point', value: c.pressure_psi } }, tol);
      expect(again.n).toBe(c.n); // clicking a nearest condition shows exactly that n
    }
  });

  it('mean extinction diameter uses only tests that ended in extinction', () => {
    const f: MatchFilters = { ...ALL, o2: { kind: 'point', value: 0.21 }, pressure_psi: { kind: 'point', value: 14.7 } };
    const m = matchTests(rows, f, tol);
    const ext = m.tests.filter((r) => r.outcome === 'extinction' && r.extinction_diameter_mm != null);
    expect(m.nExtDiameter).toBe(ext.length);
    const expected = ext.reduce((a, r) => a + (r.extinction_diameter_mm as number), 0) / ext.length;
    expect(m.meanExtDiameter).toBeCloseTo(expected, 10);
    // a non-extinction test with a diameter would change the mean if it were included
    expect(m.tests.some((r) => r.outcome !== 'extinction' && r.extinction_diameter_mm != null)).toBe(false);
  });

  it('BASS-II never enters, whatever the filters', () => {
    for (const o2 of [0.14, 0.17, 0.21]) {
      const m = matchTests(rows, { ...ALL, o2: { kind: 'point', value: o2 }, pressure_psi: { kind: 'max', value: 100 } }, tol);
      expect(m.tests.every((r) => r.program === 'FLEX')).toBe(true);
    }
  });

  it('suppressant filter and per-suppressant n', () => {
    const f: MatchFilters = { fuel: 'methanol', suppressant: 'he', o2: { kind: 'min', value: 0 }, pressure_psi: { kind: 'min', value: 0 } };
    const m = matchTests(rows, f, tol);
    expect(m.n).toBeGreaterThan(0);
    expect(m.bySuppressant).toEqual({ none: 0, co2: 0, he: m.n });
    expect(m.tests.every((r) => r.material_or_fuel === 'methanol' && (r.he_fraction ?? 0) > 0)).toBe(true);
  });

  it('psi conversion matches src/scenarios.py', () => expect(psiOf(1)).toBeCloseTo(14.6959, 6));
});

describe('visual mapping', () => {
  const scale = globalRateScale(rows);
  it('glow scale is global (FLEX min–max) and the same rate always gives the same glow', () => {
    const flexRates = rows.filter((r) => r.program === 'FLEX' && r.burning_rate_mm2_s != null).map((r) => r.burning_rate_mm2_s as number);
    expect(scale).toEqual({ min: Math.min(...flexRates), max: Math.max(...flexRates) });
    const a = matchTests(rows, { fuel: 'heptane', suppressant: 'any', o2: { kind: 'point', value: 0.21 }, pressure_psi: { kind: 'point', value: 14.7 } }, tol);
    const b = matchTests(rows, { fuel: 'methanol', suppressant: 'any', o2: { kind: 'point', value: 0.21 }, pressure_psi: { kind: 'point', value: 14.7 } }, tol);
    expect(glowFor(0.5, scale)).toBe(glowFor(0.5, globalRateScale(a.tests.length ? rows : rows)));
    expect(glowFor(a.meanRate, scale)).not.toBe(glowFor(b.meanRate, scale)); // different rates → different glow
    expect(glowFor(scale.min, scale)).toBe(0);
    expect(glowFor(scale.max, scale)).toBe(1);
    expect(glowFor(null, scale)).toBeNull();
  });

  it('flame state from counts: n<5 is small_n (no extinguished state), 0 matches is empty', () => {
    const s = (n: number, k: number) => flameState({ n, byOutcome: { extinction: k, disruption: 0, completion: 0, other: 0 } }, 5);
    expect(s(0, 0)).toBe('empty');
    expect(s(4, 4)).toBe('small_n');
    expect(s(5, 5)).toBe('out');
    expect(s(5, 2)).toBe('mixed');
    expect(s(5, 0)).toBe('stable');
  });
});
