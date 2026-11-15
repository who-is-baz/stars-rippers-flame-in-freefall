// The headline and the "test next" list must come from the JSON files, never from hand-typed figures.
import { describe, expect, it } from 'vitest';
import scenariosFile from '../../public/data/scenarios.json';
import gapsFile from '../../public/data/gaps.json';
import type { Gap, Scenario } from '../data/types';
import { CHALLENGE_SOURCE, PARTIAL_GRAVITY_NOTE, moonBaseFinding, nextTests } from './nextTests';

const scenarios = scenariosFile.scenarios as unknown as Scenario[];
const gaps = gapsFile.gaps as unknown as Gap[];
const FORBIDDEN = /\b(safe|safer|unsafe|predict\w*|probabilit\w*|risk|will|would|likely|chance)\b/i;

describe('headline finding (Moon-base air)', () => {
  const moon = scenarios.find((s) => s.id === 'lunar_challenge')!;

  it('uses n_exact and n_near of scenarios.json and names the atmosphere from its criteria', () => {
    const f = moonBaseFinding(scenarios)!;
    expect(f.n_exact).toBe(moon.n_exact);
    expect(f.n_near).toBe(moon.n_near);
    expect(f.text).toContain(`${moon.n_exact} exact tests`);
    expect(f.text).toContain(`${moon.n_near} near ones`);
    expect(f.text).toContain('≥30% O₂, ≤10.2 psi');
    expect(f.source_doi).toBe(moon.source_doi);
    expect(f.text).not.toMatch(FORBIDDEN);
  });

  it('changes when the data changes (nothing is typed by hand)', () => {
    const changed = scenarios.map((s) => (s.id === 'lunar_challenge' ? { ...s, n_exact: 1, n_near: 3 } : s));
    const f = moonBaseFinding(changed)!;
    expect(f.text).toContain('1 exact test and 3 near ones');
  });

  it('returns null without the scenario instead of inventing a sentence', () => {
    expect(moonBaseFinding(scenarios.filter((s) => s.id !== 'lunar_challenge'))).toBeNull();
  });
});

describe('What NASA should test next', () => {
  const items = nextTests(gaps, scenarios);

  it('every item comes from gaps.json or scenarios.json and carries a DOI', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(['gaps.json', 'scenarios.json']).toContain(it.source);
      expect(it.source_doi.length).toBeGreaterThan(0);
      expect(it.source_doi.every((d) => d.startsWith('10.60555/'))).toBe(true);
      expect(it.text).not.toMatch(FORBIDDEN);
    }
  });

  it('gap items keep the exact text of gaps.json', () => {
    for (const it of items.filter((x) => x.source === 'gaps.json')) {
      expect(gaps.find((g) => g.id === it.id)?.text).toBe(it.text);
    }
    expect(items.map((x) => x.id)).toEqual(expect.arrayContaining(['low_pressure', 'oxygen_gap']));
  });

  it('lists exactly the scenarios with 0 exact tests, with their own counts', () => {
    const zero = scenarios.filter((s) => s.n_exact === 0);
    const listed = items.filter((x) => x.source === 'scenarios.json');
    expect(listed.map((x) => x.id)).toEqual(zero.map((s) => `scenario_${s.id}`));
    for (const s of zero) expect(listed.find((x) => x.id === `scenario_${s.id}`)!.text).toContain(`${s.n_exact} exact FLEX tests, ${s.n_near} near`);
    expect(listed.find((x) => x.id === 'scenario_suit')!.text).toMatch(/100% O₂, 4\.3 psi/);
  });

  it('the partial-gravity line cites the challenge text and names LUCI and FM2 without figures', () => {
    expect(PARTIAL_GRAVITY_NOTE).toMatch(/challenge text/);
    expect(PARTIAL_GRAVITY_NOTE).toMatch(/LUCI/);
    expect(PARTIAL_GRAVITY_NOTE).toMatch(/FM2/);
    expect(PARTIAL_GRAVITY_NOTE).not.toMatch(/\d{2,}/);
    expect(CHALLENGE_SOURCE).toBe('NASA Space Apps challenge text');
  });
});
