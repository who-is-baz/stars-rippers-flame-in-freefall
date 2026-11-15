// Indicators of the dashboard strip. Pure functions over experiments.json, meta.json and coverage.json; nothing typed by hand.
//
// COMPLETE vs PARTIAL (per test; fields chosen from the real table schema, see docs/DECISIONS):
//   FLEX      complete = fuel, O₂ and pressure recorded + a DECLARED outcome + at least one measured magnitude
//             (burning rate or extinction diameter). Anything else is partial.
//   BASS-II   complete = material, O₂ and a DECLARED outcome. Pressure is not recorded by the investigation, and the table has no
//             measured magnitude, so neither counts as "missing". Outcome "not_stated" makes it partial.
//   "Declared outcome" = outcome present and outcome_source ≠ not_stated. AI-extracted outcomes are counted as complete but also
//   reported separately (they await human review).
// SCENARIO COVERAGE = X of Y groups with ≥ 1 test within the tolerance. Groups = each FLEX fuel (O₂ and pressure within tolerance)
//   + each BASS-II material category (O₂ only: pressure is not recorded). It is NOT a safety score.
// CONDITIONS WITHOUT EVIDENCE = (global) empty cells of the FLEX grid; (this atmosphere) fuel × suppressant combinations with no test within tolerance.
import type { ExperimentRow, Fuel, Meta } from '../data/types';
import { suppressantOf, type Suppressant } from './filters';
import { psiOf, type Crit } from './explorer';
import { isDeclared, type Atmosphere } from './relevance';

export const isComplete = (r: ExperimentRow): boolean => {
  const base = r.o2_fraction != null && isDeclared(r);
  if (r.program === 'FLEX') {
    return base && !!r.material_or_fuel && r.pressure_atm != null && (r.burning_rate_mm2_s != null || r.extinction_diameter_mm != null);
  }
  return base && !!r.material_category;
};

export interface CompletenessCounts { tests: number; complete: number; partial: number; completeAiExtracted: number; byProgram: Record<string, { tests: number; complete: number; partial: number }> }
export function completeness(rows: ExperimentRow[]): CompletenessCounts {
  const out: CompletenessCounts = { tests: rows.length, complete: 0, partial: 0, completeAiExtracted: 0, byProgram: {} };
  for (const r of rows) {
    const p = (out.byProgram[r.program] ??= { tests: 0, complete: 0, partial: 0 });
    p.tests += 1;
    if (isComplete(r)) { out.complete += 1; p.complete += 1; if (r.outcome_source === 'ai_extracted') out.completeAiExtracted += 1; }
    else { out.partial += 1; p.partial += 1; }
  }
  return out;
}

const EPS = 1e-9;
const okRelaxed = (x: number, c: Crit, tol: number) =>
  c.kind === 'point' ? Math.abs(x - c.value) <= tol + EPS : c.kind === 'min' ? x >= c.value - tol - EPS : x <= c.value + tol + EPS;

export interface Scope { fuel?: Fuel | 'any'; suppressant?: Suppressant | 'any' }
export interface CoverageGroup { name: string; program: string; n: number; basis: 'O₂ + pressure' | 'O₂ only (pressure not recorded)' }
export interface ScenarioCoverage { x: number; y: number; pct: number; groups: CoverageGroup[] }

export function scenarioCoverage(rows: ExperimentRow[], atm: Atmosphere, meta: Meta, scope: Scope = {}): ScenarioCoverage {
  const tol = meta.tolerance;
  const fuelScope = scope.fuel ?? 'any';
  const flexFuels = [...new Set(rows.filter((r) => r.program === 'FLEX').map((r) => r.material_or_fuel))].sort().filter((f) => fuelScope === 'any' || f === fuelScope);
  const materials = fuelScope === 'any' ? [...new Set(rows.filter((r) => r.program === 'BASS-II').map((r) => r.material_category))].sort() : [];
  const groups: CoverageGroup[] = [
    ...flexFuels.map((f) => ({ name: f, program: 'FLEX', basis: 'O₂ + pressure' as const, n: rows.filter((r) =>
      r.program === 'FLEX' && r.material_or_fuel === f && r.pressure_atm != null && okRelaxed(r.o2_fraction, atm.o2, tol.o2_fraction)
      && okRelaxed(psiOf(r.pressure_atm), atm.pressure_psi, tol.pressure_psi)).length })),
    ...materials.map((m) => ({ name: m, program: 'BASS-II', basis: 'O₂ only (pressure not recorded)' as const, n: rows.filter((r) =>
      r.program === 'BASS-II' && r.material_category === m && okRelaxed(r.o2_fraction, atm.o2, tol.o2_fraction)).length })),
  ];
  const x = groups.filter((g) => g.n > 0).length, y = groups.length;
  return { x, y, pct: y ? Math.round((100 * x) / y) : 0, groups };
}

export interface NoEvidence { k: number; total: number; combos: { fuel: string; suppressant: Suppressant; n: number }[] }
/** Fuel × suppressant combinations of FLEX with no test within the tolerance of the atmosphere. */
export function conditionsWithoutEvidence(rows: ExperimentRow[], atm: Atmosphere, meta: Meta, scope: Scope = {}): NoEvidence {
  const tol = meta.tolerance;
  const fuels = [...new Set(rows.filter((r) => r.program === 'FLEX').map((r) => r.material_or_fuel))].sort().filter((f) => (scope.fuel ?? 'any') === 'any' || f === scope.fuel);
  const supps: Suppressant[] = ['none', 'co2', 'he'];
  const combos = fuels.flatMap((fuel) => supps.filter((s) => (scope.suppressant ?? 'any') === 'any' || s === scope.suppressant).map((suppressant) => ({
    fuel, suppressant, n: rows.filter((r) => r.program === 'FLEX' && r.material_or_fuel === fuel && suppressantOf(r) === suppressant && r.pressure_atm != null
      && okRelaxed(r.o2_fraction, atm.o2, tol.o2_fraction) && okRelaxed(psiOf(r.pressure_atm), atm.pressure_psi, tol.pressure_psi)).length })));
  return { k: combos.filter((c) => c.n === 0).length, total: combos.length, combos };
}
