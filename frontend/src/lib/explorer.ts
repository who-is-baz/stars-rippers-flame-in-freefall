// Atmosphere explorer: RETRIEVAL of observed FLEX tests, not a simulation (docs/DECISIONES.md, 2026-11-15).
// Pure functions only. No interpolation, no extrapolation, no curve fitting: every number returned here is a
// count or a plain mean over real rows that match the filters, always with its n.
//
// Matching rules are the same as src/scenarios.py (single source of the tolerance rule):
// - a "point" criterion matches within the tolerance; "min"/"max" are strict for exact and relaxed by the
//   tolerance for near;
// - tests without pressure (C11M201) are excluded and counted in `excluded`;
// - BASS-II never enters (no pressure recorded; solid materials are a different experiment).
// The tolerance itself (±0.01 O₂, ±0.5 psi) is read from meta.json / scenarios.json, never hard-coded here.
import type { ExperimentRow, Fuel, Outcome } from '../data/types';
import { suppressantOf, type Suppressant } from './filters';

export const PSI_PER_ATM = 14.6959; // same constant as src/scenarios.py (parity with scenarios.json)
const EPS = 1e-9; // same as src/scenarios.py: avoids 0.21 - 0.01 falling outside by binary rounding

export interface Tolerance { o2_fraction: number; pressure_psi: number }
export interface Crit { kind: 'point' | 'min' | 'max'; value: number }
export interface MatchFilters {
  fuel: Fuel | 'any';
  o2: Crit;                 // O₂ mole fraction (0–1)
  pressure_psi: Crit;
  suppressant: Suppressant | 'any';
}
export interface NearestCondition {
  fuel: Fuel | 'any'; o2: number; pressure_psi: number; n: number; distance: number;
}
export interface MatchResult {
  tests: ExperimentRow[];   // near matches (= exact for point criteria)
  n: number;
  n_exact: number;
  byOutcome: Record<'extinction' | 'disruption' | 'completion', number> & { other: number };
  meanRate: number | null; nRate: number;          // mean over tests that have a burning rate
  meanExtDiameter: number | null; nExtDiameter: number; // ONLY tests that ended in extinction
  qcFlags: string[];
  bySuppressant: Record<Suppressant, number>;
  nearest: NearestCondition[];                     // filled only when n = 0
  excluded: number;                                // FLEX tests without pressure, never matched
}

export const psiOf = (atm: number) => atm * PSI_PER_ATM;

function ok(x: number, c: Crit, tol: number, relaxed: boolean): boolean {
  if (c.kind === 'point') return Math.abs(x - c.value) <= tol + EPS;
  const slack = relaxed ? tol : 0;
  return c.kind === 'min' ? x >= c.value - slack - EPS : x <= c.value + slack + EPS;
}

function shortfall(x: number, c: Crit): number {
  if (c.kind === 'point') return Math.abs(x - c.value);
  return c.kind === 'min' ? Math.max(0, c.value - x) : Math.max(0, x - c.value);
}

/** FLEX rows usable by the explorer (with pressure), filtered by fuel and suppressant only. */
export function pool(rows: ExperimentRow[], f: Pick<MatchFilters, 'fuel' | 'suppressant'>): ExperimentRow[] {
  return rows.filter((r) => r.program === 'FLEX' && r.pressure_atm != null
    && (f.fuel === 'any' || r.material_or_fuel === f.fuel)
    && (f.suppressant === 'any' || suppressantOf(r) === f.suppressant));
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function matchTests(rows: ExperimentRow[], f: MatchFilters, tol: Tolerance, maxNearest = 3): MatchResult {
  const flex = rows.filter((r) => r.program === 'FLEX');
  const usable = pool(rows, f);
  const hit = (r: ExperimentRow, relaxed: boolean) =>
    ok(r.o2_fraction, f.o2, tol.o2_fraction, relaxed) && ok(psiOf(r.pressure_atm as number), f.pressure_psi, tol.pressure_psi, relaxed);
  const tests = usable.filter((r) => hit(r, true));
  const n_exact = usable.filter((r) => hit(r, false)).length;
  const count = (o: Outcome) => tests.filter((r) => r.outcome === o).length;
  const rates = tests.map((r) => r.burning_rate_mm2_s).filter((v): v is number => v != null);
  const ext = tests.filter((r) => r.outcome === 'extinction');
  const diam = ext.map((r) => r.extinction_diameter_mm).filter((v): v is number => v != null);
  const bySuppressant: Record<Suppressant, number> = { none: 0, co2: 0, he: 0 };
  for (const r of tests) bySuppressant[suppressantOf(r) as Suppressant] += 1;
  const byOutcome = { extinction: count('extinction'), disruption: count('disruption'), completion: count('completion'), other: 0 };
  byOutcome.other = tests.length - byOutcome.extinction - byOutcome.disruption - byOutcome.completion;
  return {
    tests, n: tests.length, n_exact, byOutcome,
    meanRate: mean(rates), nRate: rates.length,
    meanExtDiameter: mean(diam), nExtDiameter: diam.length,
    qcFlags: [...new Set(tests.flatMap((r) => r.qc_flags))].sort(),
    bySuppressant,
    nearest: tests.length === 0 ? nearestConditions(usable, f, tol, maxNearest) : [],
    excluded: flex.length - flex.filter((r) => r.pressure_atm != null).length,
  };
}

/**
 * Up to `max` tested conditions closest to the filters (distance in tolerance units over O₂ and pressure, as in
 * src/scenarios.py). Each condition is a real test's own O₂ (rounded to 0.01) and pressure (0.1 psi); its n is
 * what matchTests returns at that point, so clicking it always shows that n.
 */
export function nearestConditions(usable: ExperimentRow[], f: MatchFilters, tol: Tolerance, max = 3): NearestCondition[] {
  const dist = (r: ExperimentRow) => Math.hypot(shortfall(r.o2_fraction, f.o2) / tol.o2_fraction,
    shortfall(psiOf(r.pressure_atm as number), f.pressure_psi) / tol.pressure_psi);
  const sorted = [...usable].sort((a, b) => dist(a) - dist(b));
  const out: NearestCondition[] = [];
  for (const r of sorted) {
    if (out.length >= max) break;
    const o2 = Math.round(r.o2_fraction * 100) / 100;
    const p = Math.round(psiOf(r.pressure_atm as number) * 10) / 10;
    if (out.some((c) => Math.abs(c.o2 - o2) <= tol.o2_fraction + EPS && Math.abs(c.pressure_psi - p) <= tol.pressure_psi + EPS)) continue;
    const n = usable.filter((x) => Math.abs(x.o2_fraction - o2) <= tol.o2_fraction + EPS
      && Math.abs(psiOf(x.pressure_atm as number) - p) <= tol.pressure_psi + EPS).length;
    if (n === 0) continue;
    out.push({ fuel: f.fuel, o2, pressure_psi: p, n, distance: Math.round(dist(r) * 100) / 100 });
  }
  return out;
}

// ---------------------------------------------------------------- visual mapping (data-driven, global scale)
export interface RateScale { min: number; max: number }

/** Global min/max of the observed FLEX burning rate. Depends on ALL rows only: never on the selection. */
export function globalRateScale(rows: ExperimentRow[]): RateScale {
  const v = rows.filter((r) => r.program === 'FLEX' && r.burning_rate_mm2_s != null).map((r) => r.burning_rate_mm2_s as number);
  return { min: Math.min(...v), max: Math.max(...v) };
}

/** 0–1 glow for a mean rate on the fixed global scale (linear). null when there is no rate. */
export function glowFor(rate: number | null, s: RateScale): number | null {
  if (rate == null || !(s.max > s.min)) return null;
  return Math.min(1, Math.max(0, (rate - s.min) / (s.max - s.min)));
}

export type FlameState = 'stable' | 'mixed' | 'out' | 'small_n' | 'empty';

/** Display state from counts only. n < minN → grey, no extinguish animation; 0 matches → empty. */
export function flameState(m: Pick<MatchResult, 'n' | 'byOutcome'>, minN: number): FlameState {
  if (m.n === 0) return 'empty';
  if (m.n < minN) return 'small_n';
  const k = m.byOutcome.extinction;
  if (k === m.n) return 'out';
  if (k > 0) return 'mixed';
  return 'stable';
}

/** Distinct tested values with their count (for the track density marks and "snap to tested conditions"). */
export function testedValues(values: number[], digits: number): { value: number; n: number }[] {
  const m = new Map<number, number>();
  const k = 10 ** digits;
  for (const v of values) { const r = Math.round(v * k) / k; m.set(r, (m.get(r) ?? 0) + 1); }
  return [...m].map(([value, n]) => ({ value, n })).sort((a, b) => a.value - b.value);
}

export function snap(value: number, tested: { value: number }[]): number {
  if (!tested.length) return value;
  return tested.reduce((best, t) => (Math.abs(t.value - value) < Math.abs(best - value) ? t.value : best), tested[0].value);
}
