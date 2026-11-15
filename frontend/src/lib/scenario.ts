// Reading a scenario: which group of tests to show and how to describe its criterion.
import type { ExperimentRow, Meta, Scenario, ScenarioMatch } from '../data/types';
import { fmtO2, fmtPsiAtm } from './format';
import { o2BandOf, pressureLevelOf } from './filters';

const SIGN = { point: '', min: '≥', max: '≤' } as const;
export const fmtCriterionO2 = (s: Scenario) => `${SIGN[s.criteria.o2.kind]}${fmtO2(s.criteria.o2.value)}`;
export const fmtCriterionP = (s: Scenario) => `${SIGN[s.criteria.pressure_psi.kind]}${fmtPsiAtm(s.criteria.pressure_psi.value)}`;
export const fmtTolerance = (t: Meta['tolerance']) => `±${+(t.o2_fraction * 100).toFixed(2)}% O₂, ±${t.pressure_psi} psi`;

// Group to show: the tests within tolerance; if there are none, the closest condition (which is NOT the scenario).
export function scenarioGroup(s: Scenario): { kind: 'near' | 'nearest' | 'none'; group: ScenarioMatch | null } {
  if (s.n_near > 0) return { kind: 'near', group: s.near };
  if (s.nearest) return { kind: 'nearest', group: s.nearest };
  return { kind: 'none', group: null };
}

// Coverage cells (fuel|band|level) that contain these FLEX tests: it only classifies rows.
export function cellKeysFor(testIds: string[] | undefined, rows: ExperimentRow[], meta: Meta): Set<string> {
  const ids = new Set(testIds ?? []);
  const out = new Set<string>();
  for (const r of rows) {
    if (r.program !== 'FLEX' || !ids.has(r.test_id)) continue;
    const band = o2BandOf(r.o2_fraction, meta), lvl = pressureLevelOf(r.pressure_atm, meta);
    if (band && lvl) out.add(`${r.material_or_fuel}|${band}|${lvl}`);
  }
  return out;
}
