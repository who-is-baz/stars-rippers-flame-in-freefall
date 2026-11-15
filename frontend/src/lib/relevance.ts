// Relevance of each test to an atmosphere (a scenario or the Custom settings). TRANSPARENT and fully described here; no hidden
// weights. It orders records by how close their conditions are; it is NOT a safety ranking and says nothing about hazard.
//
// Class: Exact (meets the criterion strictly) → Near (within the tolerance but not strictly) → Not near → No pressure recorded
//        (BASS-II and C11M201: pressure is unknown, so only O₂ can be compared; they come last).
// Within a class, in this order:
//   1. distance = max(|ΔO₂| / tolO₂, |Δpsi| / tolPsi)   (smaller first; for the no-pressure class only |ΔO₂| / tolO₂)
//   2. a declared outcome before "not_stated"
//   3. larger n first, where n = tests in the same cell (investigation × fuel/material × O₂ band × pressure level)
//   4. program and test_id (so the order is always the same)
// Δ is signed: row value − target for a point criterion; for ≥ / ≤ criteria it is the shortfall (0 when the criterion is met).
import type { ExperimentRow, Meta } from '../data/types';
import { o2BandOf, pressureLevelOf } from './filters';
import { PSI_PER_ATM, psiOf, type Crit, type Tolerance } from './explorer';
import { kindOf } from './table';

export type Relevance = 'exact' | 'near' | 'not_near' | 'no_pressure';
export interface Atmosphere { o2: Crit; pressure_psi: Crit }
export interface Ranked {
  row: ExperimentRow; relevance: Relevance;
  dO2: number;               // fraction (×100 for percentage points)
  dPsi: number | null;       // null when no pressure is recorded
  distance: number;          // in tolerance units
  n: number;                 // tests in the same cell
  declared: boolean;
}
export const RELEVANCE_LABEL: Record<Relevance, string> = { exact: 'Exact', near: 'Near', not_near: 'Not near', no_pressure: 'No pressure recorded' };
const ORDER: Record<Relevance, number> = { exact: 0, near: 1, not_near: 2, no_pressure: 3 };
const EPS = 1e-9;

export const isDeclared = (r: ExperimentRow): boolean => r.outcome != null && r.outcome_source !== 'not_stated';

function delta(x: number, c: Crit): number {
  if (c.kind === 'point') return x - c.value;
  return c.kind === 'min' ? Math.min(0, x - c.value) : Math.max(0, x - c.value);
}
const within = (d: number, tol: number, strict: boolean, c: Crit): boolean =>
  c.kind === 'point' ? Math.abs(d) <= tol + EPS : strict ? Math.abs(d) <= EPS : Math.abs(d) <= tol + EPS;

/** Tests per cell (program|fuel or material|O₂ band|pressure level): the "n" of the tie-break. */
export function evidenceCounts(rows: ExperimentRow[], meta: Meta): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) { const k = cellKey(r, meta); m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
}
export const cellKey = (r: ExperimentRow, meta: Meta): string =>
  `${r.program}|${kindOf(r)}|${o2BandOf(r.o2_fraction, meta) ?? '-'}|${pressureLevelOf(r.pressure_atm, meta) ?? '-'}`;

export function rankByRelevance(rows: ExperimentRow[], atm: Atmosphere, meta: Meta): Ranked[] {
  const tol: Tolerance = meta.tolerance;
  const cells = evidenceCounts(rows, meta);
  const out: Ranked[] = rows.map((row) => {
    const dO2 = delta(row.o2_fraction, atm.o2);
    const n = cells.get(cellKey(row, meta)) ?? 0;
    const declared = isDeclared(row);
    if (row.pressure_atm == null) {
      return { row, relevance: 'no_pressure', dO2, dPsi: null, distance: Math.abs(dO2) / tol.o2_fraction, n, declared };
    }
    const dPsi = delta(psiOf(row.pressure_atm), atm.pressure_psi);
    const distance = Math.max(Math.abs(dO2) / tol.o2_fraction, Math.abs(dPsi) / tol.pressure_psi);
    const exact = within(dO2, tol.o2_fraction, true, atm.o2) && within(dPsi, tol.pressure_psi, true, atm.pressure_psi);
    const near = within(dO2, tol.o2_fraction, false, atm.o2) && within(dPsi, tol.pressure_psi, false, atm.pressure_psi);
    return { row, relevance: exact ? 'exact' : near ? 'near' : 'not_near', dO2, dPsi, distance, n, declared };
  });
  return out.sort((a, b) =>
    ORDER[a.relevance] - ORDER[b.relevance]
    || a.distance - b.distance
    || Number(b.declared) - Number(a.declared)
    || b.n - a.n
    || a.row.program.localeCompare(b.row.program)
    || a.row.test_id.localeCompare(b.row.test_id));
}

/** Class counts, e.g. for the "Showing N of 403" line and the audit script. */
export function relevanceCounts(ranked: Ranked[]): Record<Relevance, number> {
  const c: Record<Relevance, number> = { exact: 0, near: 0, not_near: 0, no_pressure: 0 };
  for (const r of ranked) c[r.relevance] += 1;
  return c;
}
export { PSI_PER_ATM };
