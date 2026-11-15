// Scope of the SI assistant in Basic mode: mirror of src/backend/scope.py (the regexes are GENERATED from it, see
// scripts/gen_scope_ts.py). Anything outside the PSI data shown on this site gets one fixed refusal, no model call.
import { DISALLOWED_RE, ID_RE, INJECTION_RE, LIVE_RE, REFUSAL_TEXT, SAFETY_RE, TOPIC_RE } from './scope.generated';

export { LIVE_RE, SAFETY_RE, REFUSAL_TEXT };

const ZERO_WIDTH = /[​‌‍⁠﻿­]/g;

/** NFKC, no zero-width or control characters, collapsed spaces: the only text the rules see. */
export function normalize(q: string): string {
  return q.normalize('NFKC').replace(ZERO_WIDTH, '').replace(/[^\P{C}\n\t]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export type ScopeKind = 'in_scope' | 'injection' | 'off_topic';
export function classify(question: string): ScopeKind {
  const q = normalize(question);
  if (!q) return 'off_topic';
  if (INJECTION_RE.test(q)) return 'injection';
  if (DISALLOWED_RE.test(q) || (!TOPIC_RE.test(q) && !ID_RE.test(q.toUpperCase()))) return 'off_topic';
  return 'in_scope';
}
