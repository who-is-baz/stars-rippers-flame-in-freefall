// SI Assistant engine.
// Basic level: NO model. It picks a precomputed answer from answers.json (keyword routing) or fills a fixed
// template from one experiment row. It never computes statistics and never writes free text.
// Other levels: optional local endpoint (VITE_LLM_URL). Any failure or a 15 s timeout falls back to Basic.
import type { DataBundle } from '../data/DataProvider';
import type { Citation, ExperimentRow } from '../data/types';
import { fmtDiameter, fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { DISRUPTION_SHORT, LOW_CONFIDENCE_WARNING, hasLowConfidence, outcomeLabel } from '../lib/honesty';

export type Level = 'basic' | 'flash' | 'medium' | 'heavy';
export const LEVELS: { value: Level; label: string }[] = [
  { value: 'basic', label: 'Basic' }, { value: 'flash', label: 'Flash' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' },
];
// UI level → `level` sent to POST /ask (docs/07-api-contract.md defines low | medium | high).
// TODO(contract): "flash" has no equivalent in the contract yet; it is sent as-is until backend and frontend agree.
export const API_LEVEL: Record<Level, string> = { basic: 'low', flash: 'flash', medium: 'medium', heavy: 'high' };

export const OUT_OF_SCOPE = 'That is not in the PSI data shown on this page';
export const NO_LIVE_DATA = 'No data: these are archived ISS experiments; there is no live data on this page.';
export const FALLBACK_NOTICE = 'Local AI did not respond. This answer comes from Basic mode (no model).';
export const TIMEOUT_MS = 15_000;

export interface Reply {
  text: string;
  citations: Citation[];
  warnings: string[];
  noData: boolean;
  outOfScope: boolean;
  n: number | null;          // number of cited tests, counted from the data (null when the answer cites no test list)
  answeredBy: Level;         // which level actually produced the text
  aiText: boolean;           // true only when a model wrote the text
  notice?: string;
}

const countCited = (c: Citation[]): number | null => {
  const ids = new Set(c.flatMap((x) => x.test_ids));
  return ids.size > 0 ? ids.size : null;
};

// Order matters: specific topics first, the generic "how many tests" rule last.
const RULES: { re: RegExp; id: string }[] = [
  { re: /\b(today|right now|latest|live|real[- ]?time|currently)\b/i, id: 'live' },
  { re: /(gravity|partial|mars|martian)/i, id: 'q10' },
  { re: /(exploration|8\.2)/i, id: 'q04' },
  { re: /(suit|\beva\b|4\.3)/i, id: 'q05' },
  { re: /(moon|lunar|habitat)/i, id: 'q03' },
  { re: /disrupt/i, id: 'q07' },
  { re: /(co2|co₂|helium|\bhe\b|suppress|put out|extinguish)/i, id: 'q08' },
  { re: /(heptane|methanol|faster|burn(ing)? rate|\bfuels?\b)/i, id: 'q06' },
  { re: /(material|pmma|fabric|bass|solid|aramid|cotton|candle)/i, id: 'q09' },
  { re: /(earth|\biss\b|cabin|sea level|14\.7)/i, id: 'q02' },
  { re: /(how many|cover|experiments|dataset|tests)/i, id: 'q01' },
];

const base = (text: string, extra: Partial<Reply> = {}): Reply => ({
  text, citations: [], warnings: [], noData: false, outOfScope: false, n: null, answeredBy: 'basic', aiText: false, ...extra,
});

// Template: describe one experiment row. Every value comes from experiments.json; the sentence frame is fixed.
function describeRow(r: ExperimentRow): string {
  const parts = [
    `${r.program} test ${r.test_id} (${r.date}): ${r.material_or_fuel}, ${fmtO2(r.o2_fraction)}, pressure ${fmtPressure(r.pressure_atm).toLowerCase()}.`,
    r.outcome == null
      ? 'Outcome: not stated by the source.'
      : `In the tested conditions, we observed: ${outcomeLabel(r.outcome).toLowerCase()}${r.outcome === 'disruption' ? ` (${DISRUPTION_SHORT})` : ''}.`,
  ];
  if (r.burning_rate_mm2_s != null) parts.push(`Burning rate ${fmtRate(r.burning_rate_mm2_s)}.`);
  if (r.outcome === 'extinction' && r.extinction_diameter_mm != null) parts.push(`Extinction diameter ${fmtDiameter(r.extinction_diameter_mm)}.`);
  return parts.join(' ');
}

function lookupTest(question: string, rows: ExperimentRow[]): Reply | null {
  // FLEX-style IDs (6+ characters with a digit), or any ID written after the word "test".
  const tokens = new Set<string>();
  for (const m of question.toUpperCase().matchAll(/\b(?=[A-Z0-9]*\d)[A-Z0-9]{6,}\b/g)) tokens.add(m[0]);
  for (const m of question.matchAll(/\btest\s+#?([A-Za-z0-9]{2,})\b/gi)) tokens.add(m[1].toUpperCase());
  if (tokens.size === 0) return null;
  const hits = rows.filter((r) => tokens.has(r.test_id.toUpperCase()));
  if (hits.length === 0) return null;
  const warnings: string[] = [];
  if (hits.length > 1) warnings.push('This test ID appears more than once in the source; every matching row is listed.');
  if (hits.some((r) => r.outcome_source === 'ai_extracted')) warnings.push('Outcome extracted by AI from free-text notes; pending human review.');
  if (hits.some((r) => hasLowConfidence(r.qc_flags))) warnings.push(LOW_CONFIDENCE_WARNING);
  const flags = [...new Set(hits.flatMap((r) => r.qc_flags))];
  if (flags.length > 0) warnings.push(`QC flags: ${flags.join(', ')}`);
  const byDoi = new Map<string, string[]>();
  for (const r of hits) byDoi.set(r.source_doi, [...(byDoi.get(r.source_doi) ?? []), r.test_id]);
  const citations: Citation[] = [...byDoi].map(([source_doi, ids]) => ({ query: 'experiments', params: {}, source_doi, test_ids: [...new Set(ids)] }));
  return base(hits.map(describeRow).join(' '), { citations, warnings, n: hits.length });
}

export function answerBasic(question: string, data: DataBundle): Reply {
  const test = lookupTest(question, data.experiments.items);
  if (test) return test;
  const rule = RULES.find((r) => r.re.test(question));
  if (!rule) return base(OUT_OF_SCOPE, { outOfScope: true, noData: true });
  if (rule.id === 'live') return base(NO_LIVE_DATA, { noData: true });
  const a = data.answers.answers.find((x) => x.id === rule.id);
  if (!a) return base(OUT_OF_SCOPE, { outOfScope: true, noData: true });
  return base(a.answer, { citations: a.citations, warnings: a.warnings ?? [], noData: a.no_data, n: countCited(a.citations) });
}

// Citations from the endpoint are kept only if they point at data this page actually has:
// a known dataset DOI, and test IDs that exist in experiments.json. Anything else is dropped.
export function sanitizeCitations(raw: unknown, data: DataBundle): Citation[] {
  if (!Array.isArray(raw)) return [];
  const dois = new Set(data.meta.source_doi);
  const ids = new Set(data.experiments.items.map((r) => r.test_id));
  const out: Citation[] = [];
  for (const c of raw) {
    if (typeof c !== 'object' || c === null) continue;
    const o = c as Record<string, unknown>;
    if (typeof o.source_doi !== 'string' || !dois.has(o.source_doi)) continue;
    const testIds = Array.isArray(o.test_ids) ? o.test_ids.filter((t): t is string => typeof t === 'string' && ids.has(t)) : [];
    out.push({ query: typeof o.query === 'string' ? o.query : 'unknown', params: {}, source_doi: o.source_doi, test_ids: testIds });
  }
  return out;
}

export interface AskOptions { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number }

export async function ask(question: string, level: Level, data: DataBundle, opts: AskOptions = {}): Promise<Reply> {
  if (level === 'basic' || !opts.url) return answerBasic(question, data);
  const doFetch = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await doFetch(`${opts.url.replace(/\/+$/, '')}/ask`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ question, level: API_LEVEL[level] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    if (typeof body.answer !== 'string' || body.answer.trim() === '') throw new Error('empty answer');
    const citations = sanitizeCitations(body.citations, data);
    const warnings = Array.isArray(body.warnings) ? body.warnings.filter((w): w is string => typeof w === 'string') : [];
    if (citations.length === 0 && body.no_data !== true) warnings.push('This answer came without a verifiable citation. Treat it as unverified.');
    return {
      text: body.answer, citations, warnings, noData: body.no_data === true, outOfScope: false,
      n: countCited(citations), answeredBy: level, aiText: true,
    };
  } catch {
    return { ...answerBasic(question, data), notice: FALLBACK_NOTICE };
  } finally {
    clearTimeout(timer);
  }
}
