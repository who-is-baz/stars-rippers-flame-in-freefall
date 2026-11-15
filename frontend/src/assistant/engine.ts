// SI Assistant engine.
// Basic level: NO model. It picks a precomputed answer from answers.json (keyword routing) or fills a fixed
// template from one experiment row. It never computes statistics and never writes free text.
// Other levels: optional local endpoint (VITE_LLM_URL). Any failure or a 15 s timeout falls back to Basic.
import type { DataBundle } from '../data/DataProvider';
import type { Citation, ExperimentRow } from '../data/types';
import { fmtDiameter, fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { LIVE_RE, REFUSAL_TEXT, SAFETY_RE, SUGGESTIONS, SUGGEST_TOPICS, aboutKey, genericSite, hardBlock, hasTopic, matchAbout, normalize, renderAbout } from './scope';
import { DISRUPTION_SHORT, LOW_CONFIDENCE_WARNING, hasLowConfidence, outcomeLabel } from '../lib/honesty';

export type Level = 'basic' | 'flash' | 'medium' | 'heavy';
export const LEVELS: { value: Level; label: string }[] = [
  { value: 'basic', label: 'Basic' }, { value: 'flash', label: 'Flash' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' },
];
// UI level → `level` sent to POST /ask (docs/07-api-contract.md defines low | medium | high).
// Flash and Medium both use API level "medium"; what differs is the model (field `model`, docs/07 2026-11-15).
export const API_LEVEL: Record<Level, string> = { basic: 'low', flash: 'medium', medium: 'medium', heavy: 'high' };
export type Tier = 'flash' | 'medium' | 'heavy';
export const LEVEL_TIER: Record<Level, Tier | null> = { basic: null, flash: 'flash', medium: 'medium', heavy: 'heavy' };
// Default Ollama tags (backend FLASH_MODEL / MEDIUM_MODEL / HEAVY_MODEL); GET /llm/status overrides them.
export const DEFAULT_TAGS: Record<Tier, string> = { flash: 'llama3.2:3b', medium: 'qwen3:8b', heavy: 'qwen3:14b' };
export const DEFAULT_API_URL = 'http://127.0.0.1:8000';

export const OUT_OF_SCOPE = REFUSAL_TEXT; // one fixed refusal, same text as the backend (src/backend/scope.py)
export const SAFETY_TEXT = 'No data available for that question. These data describe what happened in specific microgravity tests on the ISS; they do not rate how safe a material, fuel or atmosphere is, and they do not predict fires elsewhere.';
export const NO_LIVE_DATA = 'No data: these are archived ISS experiments; there is no live data on this page.';
export const FALLBACK_NOTICE = 'Local AI did not respond. This answer comes from Basic mode (no model).';
export const TEMPLATE_NOTICE = 'The local AI text did not pass verification; a fixed template built from the data is shown instead.';
export const RULE_INFO = 'Answered by a fixed rule (no model call).';
const envTimeout = Number(import.meta.env?.VITE_LLM_TIMEOUT_MS);
export const TIMEOUT_MS = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 15_000;

export interface Reply {
  text: string;
  citations: Citation[];
  warnings: string[];
  noData: boolean;
  outOfScope: boolean;
  n: number | null;          // number of cited tests, counted from the data (null when the answer cites no test list)
  answeredBy: Level;         // which level actually produced the text
  aiText: boolean;           // true only when a model wrote the text
  notice?: string;            // real warning (the model failed or its text was replaced)
  info?: string;              // neutral note (e.g. a fixed rule answered): shown without the warning style
  model?: string;             // model tag that wrote the text (only when aiText)
  mode?: 'ollama' | 'fallback' | 'low';
  kind?: 'about';             // fixed answer about the page itself: cites a page section, not a dataset
  section?: string;
  suggestions?: string[];     // clickable example questions (refusal, greeting)
}

const countCited = (c: Citation[]): number | null => {
  // The API sends at most 20 IDs per citation plus test_ids_total; use the total when present.
  if (c.some((x) => typeof x.test_ids_total === 'number')) {
    const total = c.reduce((s, x) => s + (x.test_ids_total ?? x.test_ids.length), 0);
    return total > 0 ? total : null;
  }
  const ids = new Set(c.flatMap((x) => x.test_ids));
  return ids.size > 0 ? ids.size : null;
};

// Order matters: specific topics first, the generic "how many tests" rule last.
const RULES: { re: RegExp; id: string }[] = [
  { re: /\b(today|right now|latest|live|real[- ]?time|currently|hoy|en vivo|ahora mismo)\b/i, id: 'live' },
  { re: /(gravity|gravedad|partial|parcial|mars|martian|marte)/i, id: 'q10' },
  { re: /(exploration|exploraci[oó]n|8\.2)/i, id: 'q04' },
  { re: /(suit|traje|\beva\b|4\.3)/i, id: 'q05' },
  { re: /(moon|lunar|luna|habitat|h[aá]bitat)/i, id: 'q03' },
  { re: /disrupt/i, id: 'q07' },
  { re: /(co2|co₂|helium|helio|\bhe\b|suppress|supres|put out|extinguish|apaga|extingu)/i, id: 'q08' },
  { re: /(heptane|methanol|heptano|metanol|faster|r[aá]pido|burn(ing)? rate|velocidad de quemado|\bfuels?\b|combustibles?)/i, id: 'q06' },
  { re: /(material|pmma|fabric|tela|bass|solid|s[oó]lido|aramid|cotton|algod[oó]n|candle|vela)/i, id: 'q09' },
  { re: /(earth|tierra|\biss\b|cabin|cabina|sea level|nivel del mar|14\.7)/i, id: 'q02' },
  { re: /(how many|cu[aá]nt[oa]s|cover|experiments|experimentos|dataset|tests|pruebas)/i, id: 'q01' },
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

const refusal = (): Reply => base(OUT_OF_SCOPE, { outOfScope: true, noData: true, suggestions: SUGGESTIONS });
const aboutReply = (id: string, data: DataBundle): Reply => {
  const a = renderAbout(id, data);
  return base(a.text, { kind: 'about', section: a.section, suggestions: SUGGEST_TOPICS.has(id) ? SUGGESTIONS : undefined });
};

// Same decision order as src/backend/low.py route(): hard block → about the page → test ID → topic gate → live/safety → data rules.
export function answerBasic(rawQuestion: string, data: DataBundle): Reply {
  const question = normalize(rawQuestion);
  if (hardBlock(question)) return refusal();
  const suggested = new Set(data.answers.answers.map((a) => aboutKey(a.question ?? '')));
  if (!suggested.has(aboutKey(question))) {
    const topic = matchAbout(question);
    if (topic) return aboutReply(topic, data);
  }
  const test = lookupTest(question, data.experiments.items);
  if (test) return test;
  if (!hasTopic(question)) return genericSite(question) ? aboutReply('site', data) : refusal();
  if (LIVE_RE.test(question)) return base(NO_LIVE_DATA, { noData: true });
  if (SAFETY_RE.test(question)) return base(SAFETY_TEXT, { noData: true, warnings: ['All tests are microgravity on the ISS; there is no partial-gravity or normal-gravity data.'] });
  const rule = RULES.find((r) => r.re.test(question));
  if (!rule) return genericSite(question) ? aboutReply('site', data) : refusal();
  if (rule.id === 'live') return base(NO_LIVE_DATA, { noData: true });
  const a = data.answers.answers.find((x) => x.id === rule.id);
  if (!a) return refusal();
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
    const cit: Citation = { query: typeof o.query === 'string' ? o.query : 'unknown', params: {}, source_doi: o.source_doi, test_ids: testIds };
    // Keep the total only if every listed ID was verified (otherwise the count could include unknown IDs).
    const listed = Array.isArray(o.test_ids) ? o.test_ids.length : 0;
    if (typeof o.test_ids_total === 'number' && Number.isInteger(o.test_ids_total) && o.test_ids_total >= testIds.length && listed === testIds.length) {
      cit.test_ids_total = o.test_ids_total;
    }
    out.push(cit);
  }
  return out;
}

export interface AskOptions { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number; model?: string }

// GET <url>/llm/status — the browser never talks to Ollama directly.
export interface LlmModel { tag: string; tier: Tier; installed: boolean }
export interface LlmStatus { available: boolean; ollama_url: string; models: LlmModel[] }

export async function fetchLlmStatus(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 4_000): Promise<LlmStatus> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${url.replace(/\/+$/, '')}/llm/status`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const b = (await res.json()) as Partial<LlmStatus>;
    const tiers: Tier[] = ['flash', 'medium', 'heavy'];
    const models = Array.isArray(b.models)
      ? b.models.filter((m): m is LlmModel => !!m && typeof m.tag === 'string' && tiers.includes(m.tier as Tier)).map((m) => ({ tag: m.tag, tier: m.tier, installed: m.installed === true }))
      : [];
    return { available: b.available === true, ollama_url: typeof b.ollama_url === 'string' ? b.ollama_url : '', models };
  } finally {
    clearTimeout(timer);
  }
}

export async function ask(question: string, level: Level, data: DataBundle, opts: AskOptions = {}): Promise<Reply> {
  if (level === 'basic' || !opts.url) return answerBasic(question, data);
  const doFetch = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await doFetch(`${opts.url.replace(/\/+$/, '')}/ask`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ question, level: API_LEVEL[level], ...(opts.model ? { model: opts.model } : {}) }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    if (typeof body.answer !== 'string' || body.answer.trim() === '') throw new Error('empty answer');
    const citations = sanitizeCitations(body.citations, data);
    const meta = (typeof body.meta === 'object' && body.meta !== null ? body.meta : {}) as Record<string, unknown>;
    const rawWarnings = Array.isArray(meta.warnings) ? meta.warnings : Array.isArray(body.warnings) ? body.warnings : [];
    const warnings = rawWarnings.filter((w): w is string => typeof w === 'string');
    const isAbout = meta.kind === 'about';
    // Only data answers need a citation; fixed answers about the page cite a section, and refusals say "No data" / "Out of scope".
    if (citations.length === 0 && body.no_data !== true && !isAbout && body.answer !== OUT_OF_SCOPE) warnings.push('This answer came without a verifiable citation. Treat it as unverified.');
    // meta.mode: "ollama" = model text (verified), "fallback" = fixed template, "low" = fixed rule. No meta → treat as model text.
    const mode = typeof meta.mode === 'string' ? meta.mode : 'ollama';
    const kind = meta.kind === 'about' ? ('about' as const) : undefined;
    const sugg = Array.isArray(meta.suggestions) ? meta.suggestions.filter((x): x is string => typeof x === 'string') : [];
    return {
      kind, section: typeof meta.section === 'string' ? meta.section : undefined, suggestions: sugg.length ? sugg : undefined,
      text: body.answer, citations, warnings, noData: body.no_data === true,
      outOfScope: body.answer.startsWith(OUT_OF_SCOPE),
      n: countCited(citations), answeredBy: level, aiText: mode === 'ollama',
      ...(mode === 'fallback' ? { notice: TEMPLATE_NOTICE } : mode === 'low' ? { info: RULE_INFO } : {}),
      mode: mode === 'fallback' || mode === 'low' ? mode : ('ollama' as const),
      model: typeof meta.model === 'string' && mode === 'ollama' ? meta.model : undefined,
    };
  } catch {
    return { ...answerBasic(question, data), notice: FALLBACK_NOTICE };
  } finally {
    clearTimeout(timer);
  }
}
