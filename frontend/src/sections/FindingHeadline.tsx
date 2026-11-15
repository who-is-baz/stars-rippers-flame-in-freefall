// The headline finding (one sentence, computed from scenarios.json) and the "What NASA should test next" list
// (computed from gaps.json + scenarios with 0 exact tests). Counts of recorded tests only: no score, no forecast.
import { useMemo } from 'react';
import { useGaps, useMeta, useScenarios } from '../data/useData';
import { useUi } from '../state/ui';
import { CHALLENGE_SOURCE, PARTIAL_GRAVITY_NOTE, moonBaseFinding, nextTests } from '../lib/nextTests';
import { Dois } from '../components/ui';

export function FindingHeadline() {
  const { scenarios } = useScenarios();
  const meta = useMeta();
  const { openView } = useUi();
  const f = useMemo(() => moonBaseFinding(scenarios), [scenarios]);
  if (!f) return null;
  const flex = meta.programs.find((p) => p.program === 'FLEX');
  return (
    <section className="finding-headline" aria-label="Key finding">
      <p className="num">{f.text}</p>
      <span className="src-pill">FLEX{flex ? ` · ${flex.psi_id}` : ''}</span>
      <button type="button" className="ind-link" onClick={() => openView?.('gaps')}>What NASA should test next</button>
    </section>
  );
}

export function NextTestsList() {
  const { gaps } = useGaps();
  const { scenarios } = useScenarios();
  const items = useMemo(() => nextTests(gaps, scenarios), [gaps, scenarios]);
  return (
    <section className="glass card stack next-tests" aria-label="What NASA should test next">
      <h3 className="h">What NASA should test next</h3>
      <p className="dim" style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>
        Conditions with no recorded test in the data processed here. A list of evidence gaps, not an order of importance.
      </p>
      <ol className="plain next-tests-list">
        {items.map((it) => (
          <li key={it.id}>
            <span>{it.text}</span>{' '}
            <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>{it.source} · <Dois dois={it.source_doi} /></span>
          </li>
        ))}
      </ol>
      <p className="next-tests-note">
        {PARTIAL_GRAVITY_NOTE} <span className="src-pill">{CHALLENGE_SOURCE}</span>
      </p>
    </section>
  );
}
