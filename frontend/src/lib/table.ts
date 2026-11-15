// Filtering, sorting and CSV export for the experiment table. Pure functions: rows in, rows out. No statistics.
import type { ExperimentRow, Meta, O2Band, PressureLevel, Program } from '../data/types';
import { o2BandOf, pressureLevelOf, suppressantOf, type Suppressant } from './filters';

export const NOT_RECORDED = 'not_recorded';
export interface TableFilters {
  q: string;
  program: Program | '';
  kind: string;                       // fuel (FLEX) or material category (BASS-II)
  o2Band: O2Band | '';
  pressure: PressureLevel | typeof NOT_RECORDED | '';
  suppressant: Suppressant | '';
  ids: string[] | null;               // explicit list of test IDs (from a scenario)
}
export const EMPTY_FILTERS: TableFilters = { q: '', program: '', kind: '', o2Band: '', pressure: '', suppressant: '', ids: null };

// FLEX rows are described by their fuel; BASS-II rows by their material category.
export const kindOf = (r: ExperimentRow): string => (r.program === 'FLEX' ? r.material_or_fuel : r.material_category);

export function filterRows(rows: ExperimentRow[], f: TableFilters, meta: Meta): ExperimentRow[] {
  const q = f.q.trim().toLowerCase();
  const ids = f.ids ? new Set(f.ids) : null;
  return rows.filter((r) => {
    // Scenario ID lists come from FLEX (scenarios.json); BASS-II IDs never collide because the program is checked too.
    if (ids && !(r.program === 'FLEX' && ids.has(r.test_id))) return false;
    if (f.program && r.program !== f.program) return false;
    if (f.kind && kindOf(r) !== f.kind) return false;
    if (f.o2Band && o2BandOf(r.o2_fraction, meta) !== f.o2Band) return false;
    if (f.pressure === NOT_RECORDED ? r.pressure_atm != null : f.pressure && pressureLevelOf(r.pressure_atm, meta) !== f.pressure) return false;
    if (f.suppressant && suppressantOf(r) !== f.suppressant) return false;
    if (q && !`${r.test_id} ${r.material_or_fuel} ${r.material_category} ${r.outcome ?? ''} ${r.date}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export type SortKey = 'test_id' | 'date' | 'material_or_fuel' | 'o2_fraction' | 'pressure_atm' | 'outcome' | 'extinction_diameter_mm' | 'burning_rate_mm2_s';
export interface Sort { key: SortKey; dir: 'asc' | 'desc' }

// Missing values always sort last, in both directions: "not recorded" is never treated as the smallest value.
export function sortRows(rows: ExperimentRow[], sort: Sort | null): ExperimentRow[] {
  if (!sort) return rows;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sign;
  });
}

const esc = (v: unknown): string => {
  const s = v == null ? '' : Array.isArray(v) ? v.join(';') : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// CSV of exactly the filtered rows, with the file's own column names and raw values (nothing reformatted).
export function toCsv(rows: ExperimentRow[], columns: string[]): string {
  const lines = rows.map((r) => columns.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(','));
  return [columns.join(','), ...lines].join('\n');
}

export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
