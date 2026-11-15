// "Useful evidence · What the nearest tests show · What remains unresolved" for an atmosphere (scenario or Custom).
// Pure functions; every number is computed from experiments.json, never typed. Descriptive only: no forecast, no safety language.
import type { ExperimentRow, Meta } from '../data/types';
import { matchTests, type MatchFilters, type NearestCondition } from './explorer';
import { rankByRelevance, RELEVANCE_LABEL, type Atmosphere, type Ranked } from './relevance';
import { fmtTolerance } from './scenario';
import { suppressantOf } from './filters';

export const DISCLAIMER_INTERPRETATION = 'Descriptive summary of NASA test records. Not a safety assessment or a forecast.';

export interface AtmosphereContext extends Atmosphere {
  label: string;
  verified: boolean | null;        // null = Custom (user settings, nothing to verify)
  fuel: 'any' | 'heptane' | 'methanol';
  suppressant: 'any' | 'none' | 'co2' | 'he';
}
export interface Unresolved { id: string; text: string; link: 'gaps' | 'sources' }
export interface Interpretation {
  ranked: Ranked[];
  matched: Ranked[];                                   // FLEX tests within tolerance (exact + near), most relevant first
  nExact: number; nNear: number;
  bassO2: { n: number; notStated: number };            // BASS-II tests at this O₂ (pressure not recorded)
  useful: { top: Ranked[]; byProgram: Record<string, number>; byFuel: Record<string, number>; closest: NearestCondition[] };
  nearestShows: { n: number; k: number; small: boolean; text: string; outcomes: { disruption: number; completion: number } };
  unresolved: Unresolved[];
}

export function interpret(rows: ExperimentRow[], ctx: AtmosphereContext, meta: Meta): Interpretation {
  const filters: MatchFilters = { fuel: ctx.fuel, suppressant: ctx.suppressant, o2: ctx.o2, pressure_psi: ctx.pressure_psi };
  const m = matchTests(rows, filters, meta.tolerance, 3);
  const matchedIds = new Set(m.tests.map((r) => `${r.program}|${r.test_id}|${r.pressure_atm}|${r.o2_fraction}`));
  const pool = rows.filter((r) => (ctx.fuel === 'any' || r.program !== 'FLEX' || r.material_or_fuel === ctx.fuel)
    && (ctx.suppressant === 'any' || r.program !== 'FLEX' || suppressantOf(r) === ctx.suppressant));
  const ranked = rankByRelevance(pool, ctx, meta);
  const matched = ranked.filter((r) => matchedIds.has(`${r.row.program}|${r.row.test_id}|${r.row.pressure_atm}|${r.row.o2_fraction}`) && (r.relevance === 'exact' || r.relevance === 'near'));
  const byProgram: Record<string, number> = {}, byFuel: Record<string, number> = {};
  for (const r of matched) { byProgram[r.row.program] = (byProgram[r.row.program] ?? 0) + 1; byFuel[r.row.material_or_fuel] = (byFuel[r.row.material_or_fuel] ?? 0) + 1; }
  const nExact = matched.filter((r) => r.relevance === 'exact').length;

  const bass = ranked.filter((r) => r.row.program === 'BASS-II' && Math.abs(r.dO2) / meta.tolerance.o2_fraction <= 1 + 1e-9 && ctx.fuel === 'any');
  const bassO2 = { n: bass.length, notStated: bass.filter((r) => !r.declared).length };

  const n = matched.length, k = matched.filter((r) => r.row.outcome === 'extinction').length;
  const disruption = matched.filter((r) => r.row.outcome === 'disruption').length;
  const completion = matched.filter((r) => r.row.outcome === 'completion').length;
  const small = n > 0 && n < meta.min_n;
  const which = nExact === n ? 'tests within tolerance' : 'exact and near tests';
  const text = n === 0 ? 'No matching tests.'
    : small ? `n = ${n} < ${meta.min_n}: too few tests to summarise.`
    : `In ${k} of ${n} ${which} the flame ended in extinction (descriptive; n = ${n}). Also ${disruption} disruption (not defined by the source) and ${completion} completion.`;

  const tol = fmtTolerance(meta.tolerance);
  const unresolved: Unresolved[] = [];
  if (n === 0) unresolved.push({ id: 'no_match', text: `No matching tests: no FLEX test lies within ${tol} of this atmosphere.`, link: 'gaps' });
  else if (nExact === 0) unresolved.push({ id: 'no_exact', text: `No exact tests: only near ones (within ${tol}).`, link: 'gaps' });
  if (small) unresolved.push({ id: 'small_n', text: `n = ${n} < ${meta.min_n}: too few tests to read a pattern.`, link: 'sources' });
  const withGas = matched.filter((r) => suppressantOf(r.row) !== 'none').length;
  if (withGas > 0) unresolved.push({ id: 'confounded', text: `CO₂ and He are confounded with O₂ (${withGas} of ${n} matched tests have a suppressant).`, link: 'sources' });
  if (ctx.verified === false) unresolved.push({ id: 'unverified', text: 'This scenario’s NASA source is unverified: its O₂ and pressure values are not confirmed yet.', link: 'sources' });
  if (bassO2.n > 0 && bassO2.notStated > 0) unresolved.push({ id: 'not_stated', text: `${bassO2.notStated} of ${bassO2.n} BASS-II tests at this O₂ have no stated outcome (not stated does not mean no extinction).`, link: 'sources' });
  unresolved.push({ id: 'microgravity', text: 'Every test is microgravity on the ISS: there is no partial-gravity or normal-gravity data.', link: 'gaps' });
  unresolved.push({ id: 'samples', text: 'Test samples (fuel droplets, rods, films) differ from the materials and geometries of a real habitat.', link: 'sources' });
  unresolved.push({ id: 'records_only', text: 'These are records of past tests only: no model extends them to other conditions.', link: 'sources' });

  return { ranked, matched, nExact, nNear: n - nExact, bassO2, useful: { top: matched.slice(0, 3), byProgram, byFuel, closest: m.nearest },
    nearestShows: { n, k, small, text, outcomes: { disruption, completion } }, unresolved };
}

/** One line for a ranked test: "20CAL08 · methanol · Near · ΔO₂ +0.0 pp · Δpsi +0.1". */
export function describeRanked(r: Ranked): string {
  const d = (x: number | null, unit: string, scale = 1) => (x == null ? `Δ${unit} —` : `Δ${unit} ${x >= 0 ? '+' : ''}${(x * scale).toFixed(unit === 'psi' ? 2 : 1)}`);
  return `${r.row.test_id} · ${r.row.material_or_fuel || r.row.material_category} · ${RELEVANCE_LABEL[r.relevance]} · ${d(r.dO2, 'O₂ pp', 100)} · ${d(r.dPsi, 'psi')}`;
}
