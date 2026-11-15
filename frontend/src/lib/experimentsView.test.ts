import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import type { ExperimentRow } from '../data/types';
import { EMPTY_EXP, cannotTell, filterRanked, fromHash, orderRanked, toHash, whyRelevant, type ExpFilters } from './experimentsView';
import { rankByRelevance, type Atmosphere } from './relevance';

const rows = data.experiments.items as ExperimentRow[];
const meta = data.meta;
const atm = (id: string): Atmosphere => { const s = data.scenarios.scenarios.find((x) => x.id === id)!; return { o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi }; };
const ranked = rankByRelevance(rows, atm('earth_iss'), meta);
const F = (p: Partial<ExpFilters>): ExpFilters => ({ ...EMPTY_EXP, ...p });
const FORBIDDEN = /\b(safe|safer|unsafe|predict\w*|probabilit\w*|risk|will|would|likely|chance)\b/i;

describe('filters', () => {
  it('no filter = all 403; program and kind filters', () => {
    expect(filterRanked(ranked, EMPTY_EXP, meta)).toHaveLength(403);
    expect(filterRanked(ranked, F({ program: 'FLEX' }), meta)).toHaveLength(274);
    expect(filterRanked(ranked, F({ program: 'BASS-II' }), meta)).toHaveLength(129);
  });
  it('completeness filter agrees with the indicators: 283 complete, 120 partial', () => {
    expect(filterRanked(ranked, F({ completeness: 'complete' }), meta)).toHaveLength(283);
    expect(filterRanked(ranked, F({ completeness: 'partial' }), meta)).toHaveLength(120);
  });
  it('declared outcome filter: not_stated = 103 BASS-II tests; AI-extracted = 26', () => {
    expect(filterRanked(ranked, F({ outcome: 'not_stated' }), meta)).toHaveLength(103);
    expect(filterRanked(ranked, F({ ai: 'yes' }), meta)).toHaveLength(26);
    expect(filterRanked(ranked, F({ ai: 'no' }), meta)).toHaveLength(403 - 26);
  });
  it('relevance filter agrees with scenarios.json: Earth/ISS has 49 exact', () => {
    expect(filterRanked(ranked, F({ relevance: 'exact' }), meta)).toHaveLength(49);
    expect(filterRanked(ranked, F({ relevance: 'no_pressure' }), meta)).toHaveLength(130);
    const moon = rankByRelevance(rows, atm('lunar_challenge'), meta);
    expect(filterRanked(moon, F({ relevance: 'exact_near' }), meta)).toHaveLength(17);
  });
  it('combined filters: FLEX + 30–34 % O₂ + 10.3–10.5 psi', () => {
    const r = filterRanked(ranked, F({ program: 'FLEX', o2Min: '30', o2Max: '34', psiMin: '10.3', psiMax: '10.5' }), meta);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.row.program === 'FLEX' && x.row.o2_fraction >= 0.3 - 1e-9 && x.row.o2_fraction <= 0.34 + 1e-9)).toBe(true);
  });
  it('a pressure range never matches tests with no pressure (BASS-II, C11M201)', () => {
    expect(filterRanked(ranked, F({ psiMin: '0', psiMax: '100' }), meta)).toHaveLength(403 - 130);
  });
  it('n/confidence: small cells and low-confidence AI extraction (3 tests)', () => {
    expect(filterRanked(ranked, F({ evidence: 'low_confidence' }), meta)).toHaveLength(3);
    const small = filterRanked(ranked, F({ evidence: 'small_n' }), meta);
    expect(small.length).toBeGreaterThan(0);
    expect(small.every((x) => x.n < meta.min_n)).toBe(true);
  });
  it('text search by test ID, fuel and material', () => {
    expect(filterRanked(ranked, F({ q: '20cal08' }), meta).map((x) => x.row.test_id)).toEqual(['20CAL08']);
    expect(filterRanked(ranked, F({ q: 'heptane' }), meta).every((x) => x.row.material_or_fuel === 'heptane')).toBe(true);
    expect(filterRanked(ranked, F({ q: 'pmma' }), meta).length).toBeGreaterThan(0);
  });
});

describe('order and grouping', () => {
  it('default order is the relevance order; a column sort replaces it; grouping keeps FLEX first', () => {
    expect(orderRanked(ranked, null, false)).toEqual(ranked);
    const asc = orderRanked(ranked, { key: 'o2_fraction', dir: 'asc' }, false);
    expect(asc[0].row.o2_fraction).toBeLessThanOrEqual(asc[asc.length - 1].row.o2_fraction);
    const g = orderRanked(ranked, null, true);
    const firstBass = g.findIndex((x) => x.row.program === 'BASS-II');
    expect(g.slice(firstBass).every((x) => x.row.program === 'BASS-II')).toBe(true);
    expect(g).toHaveLength(403);
  });
});

describe('URL hash state', () => {
  it('round-trips and ignores junk', () => {
    const f = F({ program: 'FLEX', q: 'heptane', o2Min: '20', outcome: 'extinction', group: true, relevance: 'exact_near' });
    const h = toHash(f);
    expect(h.startsWith('#experiments?')).toBe(true);
    expect(fromHash(h)).toMatchObject({ program: 'FLEX', q: 'heptane', o2Min: '20', outcome: 'extinction', group: true, relevance: 'exact_near' });
    expect(toHash(EMPTY_EXP)).toBe('');
    expect(fromHash('#experiments?program=EVIL&outcome=drop&o2min=abc&rel=exact')).toEqual({ relevance: 'exact' });
    expect(fromHash('#assistant')).toEqual({});
  });
});

describe('test detail text', () => {
  it('Why relevant shows ΔO₂, Δpsi and the class; no pressure is stated as such', () => {
    const top = ranked[0];
    const lines = whyRelevant(top, 'Earth / ISS reference air').join(' ');
    expect(lines).toMatch(/Exact/); expect(lines).toMatch(/ΔO₂ = /); expect(lines).toMatch(/Δpsi = /);
    const b = ranked.find((x) => x.row.program === 'BASS-II') as (typeof ranked)[number];
    expect(whyRelevant(b, 'x').join(' ')).toMatch(/pressure not recorded/);
  });
  it('What this test cannot tell us is computed from its flags, with no forbidden words', () => {
    const ai = rows.find((r) => r.outcome_source === 'ai_extracted' && r.qc_flags.includes('low_confidence')) as ExperimentRow;
    const t = cannotTell(ai).join(' ');
    expect(t).toMatch(/AI/); expect(t).toMatch(/Low|low confidence/i); expect(t).toMatch(/microgravity/);
    const ns = rows.find((r) => r.outcome_source === 'not_stated') as ExperimentRow;
    expect(cannotTell(ns).join(' ')).toMatch(/does not mean the flame did not go out/);
    const dis = rows.find((r) => r.outcome === 'disruption') as ExperimentRow;
    expect(cannotTell(dis).join(' ')).toMatch(/not defined by the source/);
    for (const r of rows.slice(0, 80)) expect(cannotTell(r).join(' ')).not.toMatch(FORBIDDEN);
  });
});
