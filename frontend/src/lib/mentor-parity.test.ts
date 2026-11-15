// Parity: the TypeScript indicators, coverage, conditions without evidence, relevance order and airflow must equal an INDEPENDENT
// recomputation from experiments.csv (scripts/gen_mentor_golden.py → mentor_golden.json). The Python backend is checked against
// the same file (tests/test_relevance_parity.py) and scripts/audit_numbers.py fails if the file is stale.
import { describe, expect, it } from 'vitest';
import golden from './mentor_golden.json';
import { data } from '../test/render';
import type { ExperimentRow } from '../data/types';
import { completeness, conditionsWithoutEvidence, scenarioCoverage } from './indicators';
import { rankByRelevance, relevanceCounts } from './relevance';
import { airflowFor } from './instruments';

const rows = data.experiments.items as ExperimentRow[];

describe('parity with the independent recomputation', () => {
  it('complete / partial', () => {
    const c = completeness(rows);
    expect(c.tests).toBe(golden.completeness.tests);
    expect(c.complete).toBe(golden.completeness.complete);
    expect(c.partial).toBe(golden.completeness.partial);
    expect(c.completeAiExtracted).toBe(golden.completeness.complete_ai_extracted);
    for (const p of ['FLEX', 'BASS-II'] as const) expect(c.byProgram[p].complete).toBe(golden.completeness.by_program[p].complete);
  });
  for (const [id, g] of Object.entries(golden.scenarios)) {
    it(`scenario ${id}: coverage, conditions without evidence, relevance counts, top 10 order, airflow`, () => {
      const s = data.scenarios.scenarios.find((x) => x.id === id)!;
      const atm = { o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi };
      const cov = scenarioCoverage(rows, atm, data.meta);
      expect([cov.x, cov.y]).toEqual([g.coverage.x, g.coverage.y]);
      const ne = conditionsWithoutEvidence(rows, atm, data.meta);
      expect([ne.k, ne.total]).toEqual([g.no_evidence.k, g.no_evidence.total]);
      const ranked = rankByRelevance(rows, atm, data.meta);
      expect(relevanceCounts(ranked)).toEqual(g.relevance_counts);
      expect(ranked.slice(0, 10).map((r) => ({ program: r.row.program, test_id: r.row.test_id, relevance: r.relevance }))).toEqual(g.top10);
      const a = airflowFor(rows, data.airflow, atm, data.meta);
      if (g.airflow) expect(a).toMatchObject({ kind: 'measured', min: g.airflow.min, max: g.airflow.max, n: g.airflow.n });
      else expect(a).toEqual({ kind: 'conceptual' });
    });
  }
});
