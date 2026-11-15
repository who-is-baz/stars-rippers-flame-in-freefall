// Investigations catalog: ordering, labels and the pillar summary. Pure functions.
// The catalog text comes from investigations.json (official challenge text only); test counts, PSI ids and DOIs
// come from meta.json. The order is by evidence available on this site. It is not a ranking of hazards.
import type { Investigation, InvestigationStatus, InvestigationsFile, Meta, PillarId, ProgramMeta } from '../data/types';

export const STATUS_LABEL: Record<InvestigationStatus, string> = {
  processed: 'Test-level data on this site',
  in_psi: 'In PSI — not processed yet',
  future: 'Future (not in PSI yet)',
};
export const ORDER_NOTE = 'Ordered by evidence available on this site — not a safety ranking.';
export const ORDER_RULE = 'Test-level data on this site first, then by pillar (Prevention, Detection, Suppression, not stated), then A–Z.';
export const NOT_STATED = 'not stated';

export type PillarFilter = 'all' | PillarId | 'not stated';
const PILLAR_ORDER: Record<Investigation['pillar'], number> = { prevention: 0, detection: 1, suppression: 2, 'not stated': 3 };

export function orderInvestigations(rows: Investigation[]): Investigation[] {
  return [...rows].sort((a, b) =>
    (a.status === 'processed' ? 0 : 1) - (b.status === 'processed' ? 0 : 1)
    || PILLAR_ORDER[a.pillar] - PILLAR_ORDER[b.pillar]
    || a.name.localeCompare(b.name, 'en'));
}
export const filterByPillar = (rows: Investigation[], f: PillarFilter): Investigation[] => (f === 'all' ? rows : rows.filter((r) => r.pillar === f));

// The meta.json entry behind a row that has test-level data here (null for every other row: no figures for those).
export const programOf = (row: Investigation, meta: Meta): ProgramMeta | null =>
  (row.status === 'processed' && row.program ? meta.programs.find((p) => p.program === row.program) ?? null : null);

export const psiSearchUrl = (base: string, name: string): string => `${base}${encodeURIComponent(name)}`;

export interface PillarSummary {
  id: PillarId; label: string; what: string;
  names: string[];                                   // investigations the challenge text ties to this pillar
  processed: { name: string; n: number; psi_id: string; source_doi: string }[];
  nProcessed: number;                                // sum of meta.json counts (0 when nothing is processed here)
}
export function pillarSummary(file: InvestigationsFile, meta: Meta): PillarSummary[] {
  return file.pillars.map((p) => {
    const rows = orderInvestigations(file.investigations.filter((r) => r.pillar === p.id));
    const processed = rows.flatMap((r) => {
      const pm = programOf(r, meta);
      return pm ? [{ name: r.name, n: pm.n, psi_id: pm.psi_id, source_doi: pm.source_doi }] : [];
    });
    return { id: p.id, label: p.label, what: p.what, names: rows.map((r) => r.name), processed, nProcessed: processed.reduce((s, x) => s + x.n, 0) };
  });
}

export const pillarLabel = (file: InvestigationsFile, id: Investigation['pillar']): string =>
  file.pillars.find((p) => p.id === id)?.label ?? NOT_STATED;
