// Row of general indicators under the top bar: Tests · Investigations · Complete · Partial · Scenario coverage · Conditions without evidence.
// Every number is computed (lib/indicators.ts); every figure shows its denominator; tooltips give the definition. Not a safety score.
import { useMemo } from 'react';
import { useCoverage, useExperiments, useInvestigations, useMeta } from '../data/useData';
import { useActiveAtmosphere } from '../state/atmosphere';
import { useUi } from '../state/ui';
import { completeness, conditionsWithoutEvidence, scenarioCoverage } from '../lib/indicators';

const DEF = {
  tests: 'Tests: every record in the two NASA PSI tables (FLEX and BASS-II).',
  // filled in with the counts read from meta.json and investigations.json (see invDef)
  complete: 'Complete: a declared outcome plus the key fields of its investigation. FLEX: fuel, O₂, pressure and a measured burning rate or extinction diameter. BASS-II: material, O₂ and a declared outcome (pressure is not recorded by that investigation). AI-extracted outcomes are counted as complete and reported separately.',
  partial: 'Partial: at least one key field is missing (for example a BASS-II outcome that is not stated).',
  coverage: 'Scenario coverage: how many fuel and material groups (X of Y) have at least one test within the tolerance of this atmosphere. FLEX fuels are compared on O₂ and pressure; BASS-II material categories on O₂ only. It is a count of available records, not a safety score.',
  noev: 'Conditions without evidence: empty cells of the FLEX grid (fuel × O₂ band × pressure level), and fuel × suppressant combinations with no test within tolerance of this atmosphere.',
};

// "2 of the 20 investigations named in the challenge text have test-level data here: FLEX (PSI-69) and BASS-II (PSI-25)."
// k = meta.programs.length, n = investigations.json length, names and PSI ids from meta.json: nothing typed by hand.
export function invDef(programs: { program: string; psi_id: string }[], named: number): string {
  const list = programs.map((p) => `${p.program} (${p.psi_id})`).join(' and ');
  return `${programs.length} of the ${named} investigations named in the challenge text have test-level data here: ${list}.`;
}

export function IndicatorsStrip() {
  const { items } = useExperiments();
  const meta = useMeta();
  const named = useInvestigations().investigations.length;
  const inv = invDef(meta.programs, named);
  const coverage = useCoverage();
  const atm = useActiveAtmosphere();
  const { openView } = useUi();
  const comp = useMemo(() => completeness(items), [items]);
  const cov = useMemo(() => (atm ? scenarioCoverage(items, atm, meta, { fuel: atm.fuel }) : null), [items, atm, meta]);
  const noev = useMemo(() => (atm ? conditionsWithoutEvidence(items, atm, meta, { fuel: atm.fuel, suppressant: atm.suppressant }) : null), [items, atm, meta]);
  const aiShown = comp.completeAiExtracted;
  return (
    <section className="ind-strip" aria-label="Dataset indicators">
      <dl className="ind-list num">
        <div title={DEF.tests}><dt>Tests</dt><dd>{comp.tests}</dd></div>
        <div title={`Investigations: ${inv}`}><dt>Investigations</dt><dd><button type="button" className="ind-num-link" aria-label={`${inv} Open the investigations catalog`} onClick={() => openView?.('investigations')}>{meta.programs.length} <small>of {named}</small></button></dd></div>
        <div title={DEF.complete}><dt>Complete</dt><dd>{comp.complete} <small>of {comp.tests}</small><small className="ind-sub"> · {aiShown} AI-extracted</small></dd></div>
        <div title={DEF.partial}><dt>Partial</dt><dd>{comp.partial} <small>of {comp.tests}</small></dd></div>
        {cov && (
          <div title={DEF.coverage}><dt>Scenario coverage</dt><dd>{cov.x} <small>of {cov.y} groups ({cov.pct}%)</small></dd></div>
        )}
        <div title={DEF.noev}>
          <dt>Without evidence</dt>
          <dd>{coverage.n_cells_empty} <small>of {coverage.n_cells} grid cells</small>{noev && <small className="ind-sub"> · {noev.k} of {noev.total} here</small>}</dd>
        </div>
      </dl>
      <button type="button" className="ind-link" onClick={() => openView?.('gaps')}>See gaps</button>
    </section>
  );
}
