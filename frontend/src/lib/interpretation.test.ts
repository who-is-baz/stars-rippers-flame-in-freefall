import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import type { ExperimentRow } from '../data/types';
import { DISCLAIMER_INTERPRETATION, describeRanked, interpret, type AtmosphereContext } from './interpretation';

const rows = data.experiments.items as ExperimentRow[];
const ctxOf = (id: string): AtmosphereContext => {
  const s = data.scenarios.scenarios.find((x) => x.id === id)!;
  return { o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi, label: s.label, verified: s.verified, fuel: 'any', suppressant: 'any' };
};
const FORBIDDEN = /\b(safe|safer|unsafe|safety|predict\w*|forecast\w*|probabilit\w*|risk|will|would|likely|chance)\b/i;
const allText = (id: string) => { const i = interpret(rows, ctxOf(id), data.meta); return [i.nearestShows.text, ...i.unresolved.map((u) => u.text), ...i.useful.top.map(describeRanked)].join(' | '); };

describe('interpretation of an atmosphere', () => {
  it('Moon base: 0 exact, 17 near; counts agree with scenarios.json; the summary has n and no percentage', () => {
    const i = interpret(rows, ctxOf('lunar_challenge'), data.meta);
    expect([i.nExact, i.matched.length]).toEqual([0, 17]);
    expect(i.useful.top).toHaveLength(3);
    expect(Object.values(i.useful.byFuel).reduce((a, b) => a + b, 0)).toBe(17);
    expect(i.nearestShows.text).toMatch(/In 0 of 17 .* ended in extinction \(descriptive; n = 17\)/);
    expect(i.nearestShows.text).toMatch(/15 disruption .*2 completion/);
    expect(i.nearestShows.text).not.toMatch(/%/);
    const ids = i.unresolved.map((u) => u.id);
    expect(ids).toContain('no_exact'); expect(ids).not.toContain('unverified');   // the challenge scenario is verified
    expect(ids).toEqual(expect.arrayContaining(['microgravity', 'samples', 'records_only']));
  });
  it('Earth/ISS: exact tests, mixed outcomes, confounded gases listed', () => {
    const i = interpret(rows, ctxOf('earth_iss'), data.meta);
    expect(i.matched).toHaveLength(49);
    expect(i.nExact).toBe(49);
    expect(i.unresolved.map((u) => u.id)).toContain('confounded');
    expect(i.nearestShows.k).toBe(i.matched.filter((r) => r.row.outcome === 'extinction').length);
  });
  it('unverified scenarios say so', () => {
    for (const id of ['lunar_nasa', 'exploration', 'suit']) expect(interpret(rows, ctxOf(id), data.meta).unresolved.map((u) => u.id)).toContain('unverified');
  });
  it('Spacesuit (0/0): "No matching tests", no figures, the 3 closest tested conditions, nothing interpolated', () => {
    const i = interpret(rows, ctxOf('suit'), data.meta);
    expect(i.matched).toHaveLength(0);
    expect(i.nearestShows.text).toBe('No matching tests.');
    expect(i.useful.top).toHaveLength(0);
    expect(i.useful.closest.length).toBeGreaterThan(0);
    expect(i.useful.closest.length).toBeLessThanOrEqual(3);
    expect(i.unresolved[0].id).toBe('no_match');
    for (const c of i.useful.closest) expect(c.n).toBeGreaterThan(0);        // real tested conditions only
  });
  it('n < 5 gives only a warning (no counts of extinction, no percentage)', () => {
    const i = interpret(rows, { ...ctxOf('earth_iss'), o2: { kind: 'point', value: 0.15 }, pressure_psi: { kind: 'point', value: 10.3 } }, data.meta);
    expect(i.nearestShows.small).toBe(true);
    expect(i.nearestShows.text).toBe('n = 4 < 5: too few tests to summarise.');
    expect(i.unresolved.map((u) => u.id)).toContain('small_n');
  });
  it('BASS-II not_stated is reported separately and never as no extinction', () => {
    const i = interpret(rows, ctxOf('earth_iss'), data.meta);
    expect(i.bassO2.n).toBeGreaterThan(0);
    expect(i.unresolved.find((u) => u.id === 'not_stated')?.text).toMatch(/does not mean no extinction/);
  });
  it('no forbidden words in any generated text, for every scenario', () => {
    for (const s of data.scenarios.scenarios) expect(allText(s.id)).not.toMatch(FORBIDDEN);
    expect(DISCLAIMER_INTERPRETATION).toBe('Descriptive summary of NASA test records. Not a safety assessment or a forecast.');
  });
});
