// Experiments view: filters (on top of lib/table.ts), relevance-aware ordering, grouping by investigation and URL-hash state.
// Pure functions. The relevance formula lives in lib/relevance.ts and is documented in Methods & Sources.
import type { ExperimentRow, Meta, Outcome } from '../data/types';
import { filterRows, EMPTY_FILTERS, sortRows, type Sort, type TableFilters } from './table';
import { isComplete } from './indicators';
import { flagLabel, hasLowConfidence, DISRUPTION_SHORT, MICROGRAVITY_NOTE, CONFOUND_NOTE, NOT_STATED_NOTE } from './honesty';
import { suppressantOf } from './filters';
import { psiOf } from './explorer';
import { RELEVANCE_LABEL, type Ranked, type Relevance } from './relevance';

export type RelFilter = '' | Relevance | 'exact_near';
export interface ExpFilters extends TableFilters {
  o2Min: string; o2Max: string;                 // percent, as typed
  psiMin: string; psiMax: string;               // psi, as typed
  outcome: '' | Outcome | 'not_stated';
  completeness: '' | 'complete' | 'partial';
  evidence: '' | 'small_n' | 'low_confidence';  // n of the cell < min_n, or low-confidence AI extraction
  ai: '' | 'yes' | 'no';                        // AI-extracted outcome
  relevance: RelFilter;
  group: boolean;                               // group by investigation
}
export const EMPTY_EXP: ExpFilters = { ...EMPTY_FILTERS, o2Min: '', o2Max: '', psiMin: '', psiMax: '', outcome: '', completeness: '', evidence: '', ai: '', relevance: '', group: false };

const num = (s: string): number | null => { const v = s.trim() === '' ? NaN : Number(s); return Number.isFinite(v) ? v : null; };

export function filterRanked(ranked: Ranked[], f: ExpFilters, meta: Meta): Ranked[] {
  const base = new Set(filterRows(ranked.map((r) => r.row), f, meta));
  const o2lo = num(f.o2Min), o2hi = num(f.o2Max), plo = num(f.psiMin), phi = num(f.psiMax);
  return ranked.filter((r) => {
    const x = r.row;
    if (!base.has(x)) return false;
    if (o2lo != null && x.o2_fraction * 100 < o2lo - 1e-9) return false;
    if (o2hi != null && x.o2_fraction * 100 > o2hi + 1e-9) return false;
    if (plo != null || phi != null) {
      if (x.pressure_atm == null) return false;                      // an unknown pressure never matches a pressure range
      const p = psiOf(x.pressure_atm);
      if (plo != null && p < plo - 1e-9) return false;
      if (phi != null && p > phi + 1e-9) return false;
    }
    if (f.outcome) { if (f.outcome === 'not_stated' ? x.outcome_source !== 'not_stated' : x.outcome !== f.outcome) return false; }
    if (f.completeness && (f.completeness === 'complete') !== isComplete(x)) return false;
    if (f.evidence === 'small_n' && r.n >= meta.min_n) return false;
    if (f.evidence === 'low_confidence' && !hasLowConfidence(x.qc_flags)) return false;
    if (f.ai && (f.ai === 'yes') !== (x.outcome_source === 'ai_extracted')) return false;
    if (f.relevance === 'exact_near' ? !(r.relevance === 'exact' || r.relevance === 'near') : f.relevance && r.relevance !== f.relevance) return false;
    return true;
  });
}

/** Default order = relevance (as ranked). A column sort replaces it. Grouping keeps FLEX first, each group in the same order. */
export function orderRanked(rs: Ranked[], sort: Sort | null, group: boolean): Ranked[] {
  let out = rs;
  if (sort) {
    const by = new Map(rs.map((r) => [r.row, r] as const));
    out = sortRows(rs.map((r) => r.row), sort).map((x) => by.get(x) as Ranked);
  }
  if (!group) return out;
  return [...out.filter((r) => r.row.program === 'FLEX'), ...out.filter((r) => r.row.program !== 'FLEX')];
}

// ---------------------------------------------------------------- URL hash state (#experiments?q=…&program=…)
const KEYS: [keyof ExpFilters, string][] = [['q', 'q'], ['program', 'program'], ['kind', 'kind'], ['o2Min', 'o2min'], ['o2Max', 'o2max'], ['psiMin', 'psimin'], ['psiMax', 'psimax'],
  ['outcome', 'outcome'], ['completeness', 'comp'], ['evidence', 'ev'], ['ai', 'ai'], ['relevance', 'rel'], ['group', 'group']];
export function toHash(f: ExpFilters): string {
  const p = new URLSearchParams();
  for (const [k, name] of KEYS) { const v = f[k]; if (v !== EMPTY_EXP[k] && v !== '' && v !== false) p.set(name, v === true ? '1' : String(v)); }
  const s = p.toString();
  return s ? `#experiments?${s}` : '';
}
const PICK = {
  program: ['FLEX', 'BASS-II'], outcome: ['extinction', 'disruption', 'completion', 'blowoff', 'no_ignition', 'not_sustained', 'not_stated'],
  completeness: ['complete', 'partial'], evidence: ['small_n', 'low_confidence'], ai: ['yes', 'no'], relevance: ['exact', 'near', 'not_near', 'no_pressure', 'exact_near'],
} as const;
/** Parse a hash; unknown values are ignored (the URL is untrusted input). */
export function fromHash(hash: string): Partial<ExpFilters> {
  const m = /^#experiments\?(.*)$/.exec(hash);
  if (!m) return {};
  const p = new URLSearchParams(m[1]);
  const out: Record<string, unknown> = {};
  for (const [k, name] of KEYS) {
    const v = p.get(name);
    if (v == null) continue;
    if (k === 'group') out[k] = v === '1';
    else if (k in PICK) { if ((PICK as Record<string, readonly string[]>)[k].includes(v)) out[k] = v; }
    else if (k === 'o2Min' || k === 'o2Max' || k === 'psiMin' || k === 'psiMax') { if (Number.isFinite(Number(v))) out[k] = v; }
    else out[k] = v.slice(0, 80);
  }
  return out as Partial<ExpFilters>;
}

// ---------------------------------------------------------------- per-test detail
export function whyRelevant(r: Ranked, atmosphere: string): string[] {
  const d = (x: number | null, nd: number, unit: string) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(nd)} ${unit}`);
  const lines = [`Compared with “${atmosphere}”: ${RELEVANCE_LABEL[r.relevance]}.`,
    `ΔO₂ = ${d(r.dO2 * 100, 2, 'percentage points')}; Δpsi = ${r.dPsi == null ? '— (pressure not recorded)' : d(r.dPsi, 2, 'psi')}.`,
    `Distance ${r.distance.toFixed(2)} tolerance units; ${r.n} tests in the same cell.`];
  if (r.relevance === 'no_pressure') lines.push('Only O₂ can be compared: no pressure is recorded for this test.');
  return lines;
}

/** What this test cannot tell us: computed from its own flags and fields plus the limits that apply to every test. */
export function cannotTell(x: ExperimentRow): string[] {
  const out: string[] = [];
  if (x.outcome_source === 'not_stated') out.push(NOT_STATED_NOTE);
  if (x.outcome_source === 'ai_extracted') out.push('Its outcome was read from free-text notes by AI and awaits human review.');
  if (hasLowConfidence(x.qc_flags)) out.push('The AI extraction of its outcome is low confidence.');
  if (x.pressure_atm == null) out.push('Pressure is not recorded, so it cannot be placed on a pressure axis.');
  if (x.outcome === 'disruption') out.push(`“Disruption” is ${DISRUPTION_SHORT}.`);
  if (x.program === 'FLEX' && suppressantOf(x) !== 'none') out.push(CONFOUND_NOTE);
  if (x.burning_rate_mm2_s == null && x.program === 'FLEX') out.push('No burning rate is recorded for it.');
  for (const f of x.qc_flags) if (f !== 'low_confidence') out.push(`QC flag: ${flagLabel(f)}.`);
  out.push(MICROGRAVITY_NOTE);
  out.push(x.program === 'FLEX' ? 'It is one fuel droplet in a test chamber: it does not represent the materials or geometry of a real habitat.' : 'It is one solid sample in an air flow: it does not represent the materials or geometry of a real habitat.');
  return out;
}
