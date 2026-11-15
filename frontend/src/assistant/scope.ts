// Scope of the SI assistant in Basic mode: mirror of src/backend/scope.py + about.py (the regexes and texts are GENERATED
// from them, see scripts/gen_scope_ts.py). Anything outside the PSI data and this page gets one fixed refusal; questions
// about the page itself get a fixed "about the site" answer with figures computed from the data. No model either way.
import type { DataBundle } from '../data/DataProvider';
import { completeness } from '../lib/indicators';
import {
  ABOUT_GREETING, ABOUT_NOUN_RE, ABOUT_SUGGESTIONS, ABOUT_TOPICS, ABOUT_TYPOS, ABOUT_VERB_RE,
  DISALLOWED_RE, ID_RE, INJECTION_RE, LIVE_RE, REFUSAL_TEXT, SAFETY_RE, TOPIC_RE,
} from './scope.generated';

export { LIVE_RE, SAFETY_RE, REFUSAL_TEXT };
export const SUGGESTIONS: string[] = ABOUT_SUGGESTIONS;

const ZERO_WIDTH = /[​‌‍⁠﻿­]/g;
/** NFKC, no zero-width or control characters, collapsed spaces: the only text the rules see. */
export function normalize(q: string): string {
  return q.normalize('NFKC').replace(ZERO_WIDTH, '').replace(/[^\P{C}\n\t]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const TYPO_RULES = ABOUT_TYPOS.map(([p, r]) => [new RegExp(p, 'g'), r] as const);
/** Lower case, no accents, common typos fixed (mirror of about.prep). */
export function prep(text: string): string {
  let t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [rx, rep] of TYPO_RULES) t = t.replace(rx, rep);
  return t.replace(/\s+/g, ' ').trim();
}
export const aboutKey = (q: string): string => prep(q).replace(/[^a-z0-9]+/g, ' ').trim();

export function hardBlock(question: string): 'injection' | 'off_topic' | null {
  const q = normalize(question);
  if (!q) return 'off_topic';
  if (INJECTION_RE.test(q)) return 'injection';
  if (DISALLOWED_RE.test(q)) return 'off_topic';
  return null;
}
export const hasTopic = (question: string): boolean => {
  const q = normalize(question);
  return TOPIC_RE.test(q) || ID_RE.test(q.toUpperCase());
};

/** Id of the explicit "about the page" topic, or null. */
export function matchAbout(question: string): string | null {
  const t = prep(question);
  if (ABOUT_GREETING.test(t)) return 'greeting';
  return ABOUT_TOPICS.find((x) => x.re.test(t))?.id ?? null;
}
export const genericSite = (question: string): boolean => {
  const t = prep(question);
  return ABOUT_NOUN_RE.test(t) && ABOUT_VERB_RE.test(t);
};

export type ScopeKind = 'in_scope' | 'injection' | 'off_topic' | 'about';
export function classify(question: string): ScopeKind {
  const hb = hardBlock(question);
  if (hb) return hb;
  if (matchAbout(question) || genericSite(question)) return 'about';
  return hasTopic(question) ? 'in_scope' : 'off_topic';
}

const g = (x: number, nd = 2) => String(+x.toFixed(nd));
/** Figures used by the "about" texts, all computed from the data files (mirror of data.site_facts). */
export function siteFacts(d: DataBundle): Record<string, string | number> {
  const n = (p: string) => d.meta.programs.find((x) => x.program === p)?.n ?? 0;
  const doi = (p: string) => d.meta.programs.find((x) => x.program === p)?.source_doi ?? '';
  const moon = d.scenarios.scenarios.find((s) => s.id === 'lunar_challenge');
  const gap = (id: string) => d.gaps.gaps.find((x) => x.id === id)?.evidence as Record<string, number> | undefined;
  const comp = completeness(d.experiments.items);
  return {
    n_complete: comp.complete, n_partial: comp.partial, n_complete_ai: comp.completeAiExtracted, n_empty_cells: d.coverage.n_cells_empty,
    n_tests: d.meta.programs.reduce((a, p) => a + p.n, 0), n_flex: n('FLEX'), n_bass: n('BASS-II'),
    doi_flex: doi('FLEX'), doi_bass: doi('BASS-II'),
    tol_o2: g(d.meta.tolerance.o2_fraction * 100), tol_psi: String(d.meta.tolerance.pressure_psi), min_n: d.meta.min_n,
    n_cells: d.coverage.n_cells, n_cells_tested: d.coverage.n_cells - d.coverage.n_cells_empty,
    n_moon_exact: moon?.n_exact ?? 0, n_moon_near: moon?.n_near ?? 0,
    gap_psi_min: String(gap('low_pressure')?.min_psi ?? ''), gap_o2_max_pct: g((gap('high_oxygen')?.flex_o2_max ?? 0) * 100),
  };
}
export function renderAbout(id: string, d: DataBundle): { text: string; section: string } {
  const t = ABOUT_TOPICS.find((x) => x.id === id) ?? ABOUT_TOPICS[0];
  let text = t.text;
  for (const [k, v] of Object.entries(siteFacts(d))) text = text.split(`{${k}}`).join(String(v));
  return { text, section: t.section };
}
export const SUGGEST_TOPICS = new Set(['greeting', 'capabilities']);
