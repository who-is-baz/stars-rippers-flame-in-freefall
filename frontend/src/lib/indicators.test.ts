import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import type { ExperimentRow } from '../data/types';
import { completeness, conditionsWithoutEvidence, isComplete, scenarioCoverage } from './indicators';
import { rankByRelevance, relevanceCounts, type Atmosphere } from './relevance';

const rows = data.experiments.items as ExperimentRow[];
const meta = data.meta;
const atmOf = (id: string): Atmosphere => { const s = data.scenarios.scenarios.find((x) => x.id === id)!; return { o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi }; };
const row = (patch: Partial<ExperimentRow>): ExperimentRow => ({ ...(rows.find((r) => r.program === 'FLEX' && r.burning_rate_mm2_s != null) as ExperimentRow), ...patch });

describe('complete vs partial', () => {
  it('counts match the data: FLEX 257/17, BASS-II 26/103, total 283/120; the 26 complete BASS-II are AI-extracted', () => {
    const c = completeness(rows);
    expect([c.tests, c.complete, c.partial]).toEqual([403, 283, 120]);
    expect(c.byProgram['FLEX']).toEqual({ tests: 274, complete: 257, partial: 17 });
    expect(c.byProgram['BASS-II']).toEqual({ tests: 129, complete: 26, partial: 103 });
    expect(c.completeAiExtracted).toBe(26);
  });
  it('the rules', () => {
    expect(isComplete(row({}))).toBe(true);
    expect(isComplete(row({ pressure_atm: null }))).toBe(false);
    expect(isComplete(row({ burning_rate_mm2_s: null, extinction_diameter_mm: null }))).toBe(false);
    expect(isComplete(row({ burning_rate_mm2_s: null, extinction_diameter_mm: 2 }))).toBe(true);
    expect(isComplete(row({ outcome: null, outcome_source: 'not_stated' }))).toBe(false);
    const bass = rows.find((r) => r.program === 'BASS-II' && r.outcome_source === 'ai_extracted') as ExperimentRow;
    expect(isComplete(bass)).toBe(true);                       // no pressure / measured magnitude required for BASS-II
    expect(isComplete({ ...bass, outcome: null, outcome_source: 'not_stated' })).toBe(false);
  });
});

describe('scenario coverage and conditions without evidence', () => {
  it('Earth/ISS: shows X of Y and the percentage as X/Y; the groups list explains the basis', () => {
    const c = scenarioCoverage(rows, atmOf('earth_iss'), meta);
    expect(c.y).toBe(2 + 7);                                   // 2 FLEX fuels + 7 BASS-II material categories
    expect(c.x).toBeGreaterThanOrEqual(2);
    expect(c.pct).toBe(Math.round((100 * c.x) / c.y));
    expect(c.groups.filter((g) => g.program === 'BASS-II').every((g) => g.basis.startsWith('O₂ only'))).toBe(true);
  });
  it('Spacesuit (0 exact, 0 near): no FLEX fuel has a test; coverage counts only what is within tolerance', () => {
    const c = scenarioCoverage(rows, atmOf('suit'), meta);
    expect(c.groups.filter((g) => g.program === 'FLEX').every((g) => g.n === 0)).toBe(true);
    const e = conditionsWithoutEvidence(rows, atmOf('suit'), meta);
    expect(e.k).toBe(e.total);
    expect(e.total).toBe(6);                                    // 2 fuels × (none, co2, he)
  });
  it('Moon base: FLEX near tests exist only without suppressant', () => {
    const e = conditionsWithoutEvidence(rows, atmOf('lunar_challenge'), meta);
    expect(e.combos.filter((c) => c.n > 0).every((c) => c.suppressant === 'none')).toBe(true);
    expect(e.k).toBeLessThan(e.total);
  });
  it('a fuel filter narrows the groups and drops BASS-II', () => {
    const c = scenarioCoverage(rows, atmOf('earth_iss'), meta, { fuel: 'heptane' });
    expect(c.groups.map((g) => g.name)).toEqual(['heptane']);
  });
  it('global grid numbers come from coverage.json: 10 of 30 cells empty', () => {
    expect([data.coverage.n_cells, data.coverage.n_cells_empty]).toEqual([30, 10]);
  });
});

describe('relevance order (transparent, no hidden weights)', () => {
  it('counts per class agree with scenarios.json (exact/near) for every scenario', () => {
    for (const s of data.scenarios.scenarios) {
      const rc = relevanceCounts(rankByRelevance(rows, atmOf(s.id), meta));
      expect([s.id, rc.exact, rc.exact + rc.near]).toEqual([s.id, s.n_exact, s.n_near]);
      expect(rc.no_pressure).toBe(129 + 1);                     // BASS-II + C11M201
    }
  });
  it('exact first, then near by distance, then not near, then no-pressure last', () => {
    const r = rankByRelevance(rows, atmOf('lunar_challenge'), meta);
    const order = r.map((x) => x.relevance);
    const firstOf = (k: string) => order.indexOf(k as never);
    expect(order.slice(0, 17).every((x) => x === 'near')).toBe(true);
    expect(firstOf('not_near')).toBe(17);
    expect(order[order.length - 1]).toBe('no_pressure');
    const near = r.slice(0, 17).map((x) => x.distance);
    expect(near).toEqual([...near].sort((a, b) => a - b));
  });
  it('ties: declared outcome before not_stated, then larger n, then test_id', () => {
    const a = row({ test_id: 'AAA', o2_fraction: 0.21, pressure_atm: 1.0 });
    const b = row({ test_id: 'BBB', o2_fraction: 0.21, pressure_atm: 1.0, outcome: null, outcome_source: 'not_stated' });
    const c = row({ test_id: 'CCC', o2_fraction: 0.21, pressure_atm: 1.0 });
    const rk = rankByRelevance([b, c, a], { o2: { kind: 'point', value: 0.21 }, pressure_psi: { kind: 'point', value: 14.6959 } }, meta);
    expect(rk.map((x) => x.row.test_id)).toEqual(['AAA', 'CCC', 'BBB']);
  });
  it('signed deltas: point criterion = row − target; ≥ / ≤ criteria give the shortfall (0 when met)', () => {
    const r = rankByRelevance([row({ test_id: 'X1', o2_fraction: 0.32, pressure_atm: 0.7 })], atmOf('lunar_challenge'), meta)[0];
    expect(r.dO2).toBe(0);                                       // 32 % meets ≥ 30 %
    expect(r.dPsi).toBeGreaterThan(0);                           // 10.29 psi is above ≤ 10.2: shortfall
    const e = rankByRelevance([row({ test_id: 'X2', o2_fraction: 0.2, pressure_atm: 1 })], atmOf('earth_iss'), meta)[0];
    expect(e.dO2).toBeCloseTo(-0.01, 6);
  });
  it('a scenario with no tests in tolerance still orders everything by distance (nothing is invented)', () => {
    const r = rankByRelevance(rows, atmOf('suit'), meta);
    expect(r.filter((x) => x.relevance === 'exact' || x.relevance === 'near')).toHaveLength(0);
    const d = r.filter((x) => x.relevance === 'not_near').map((x) => x.distance);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });
  it('BASS-II rows are never exact or near (no pressure) and carry no Δpsi', () => {
    const r = rankByRelevance(rows, atmOf('earth_iss'), meta).filter((x) => x.row.program === 'BASS-II');
    expect(r.every((x) => x.relevance === 'no_pressure' && x.dPsi === null)).toBe(true);
  });
});
