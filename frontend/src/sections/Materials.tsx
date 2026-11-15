import type { MaterialGroup, Outcome } from '../data/types';
import { useMaterials } from '../data/useData';
import { useUi } from '../state/ui';
import { Badge, Doi, Note, QcChips, Section, Warn } from '../components/ui';
import { LOW_CONFIDENCE_WARNING, NOT_STATED_NOTE, outcomeLabel } from '../lib/honesty';

// BASS-II is context only. Counts are shown as counts: no extinction percentage, no safety ordering.
// O₂ is shown as the measured mole fraction (as in the file), so no "%" figure appears in this section at all.
const CLASS_LABEL: Record<string, string> = {
  flammable_demonstrated: 'Flame observed in at least one test',
  undetermined: 'Undetermined: no stated outcome',
};

function Group({ g }: { g: MaterialGroup }) {
  const outcomes = Object.entries(g.n_by_outcome) as [Outcome, number][];
  return (
    <>
      <dl className="kv">
        <dt>Tests (n)</dt><dd className="num">{g.n}</dd>
        <dt>With a stated outcome</dt><dd className="num">{g.n_with_outcome} of {g.n}</dd>
        <dt>Not stated by the source</dt><dd className="num">{g.n_not_stated} of {g.n}</dd>
        <dt>Stated outcomes (count)</dt>
        <dd>{outcomes.length === 0 ? <span className="nodata">No data</span> : outcomes.map(([o, n]) => `${outcomeLabel(o)} ${n}`).join(' · ')}</dd>
        <dt>Measured O₂ (mole fraction)</dt><dd className="num">{g.o2_min}–{g.o2_max}</dd>
        <dt>QC flags</dt><dd><QcChips flags={g.qc_flags} /></dd>
      </dl>
      {g.warning && <Warn>{g.warning}</Warn>}
      {g.n_low_confidence > 0 && <Warn>{g.n_low_confidence} of these: {LOW_CONFIDENCE_WARNING}</Warn>}
    </>
  );
}

export function Materials() {
  const m = useMaterials();
  const { showTests } = useUi();
  const withOutcome = m.materials.reduce((sum, x) => sum + x.n_with_outcome, 0); // sum of counts already in the file
  return (
    <Section id="materials" eyebrow="Materials · BASS-II" title="Solid materials: context only"
      lead={<>BASS-II burned solid samples in an airflow. It is shown for context and is not compared with FLEX. Only{' '}
        <strong className="num">{withOutcome} of {m.n_tests}</strong> tests have an outcome stated in the source notes.</>}>
      <div className="stack" data-testid="materials">
        <Warn>
          Outcomes here were extracted by AI from free-text notes and await human review. {NOT_STATED_NOTE}
        </Warn>
        <div className="grid-auto">
          {m.materials.map((x) => (
            <article key={x.material_category} className="glass card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 className="h mono">{x.material_category}</h3>
                {x.n_with_outcome > 0 && <Badge tone="info">AI-extracted</Badge>}
              </div>
              <p className="dim" style={{ fontSize: 'var(--fs-sm)' }}>{CLASS_LABEL[x.classification] ?? x.classification}</p>
              <Group g={x} />
              {x.by_color && (
                <details>
                  <summary>By colour (do not average black and clear together)</summary>
                  <div className="stack" style={{ marginTop: 12 }}>
                    {x.by_color.map((c) => (
                      <div key={c.color} className="match">
                        <span className="label">{c.color}</span>
                        <Group g={c} />
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <div>
                <button type="button" className="btn btn-sm" onClick={() => showTests({ program: 'BASS-II', fuel: x.material_category })}>
                  View {x.n === 1 ? 'this test' : `these ${x.n} tests`}
                </button>
              </div>
            </article>
          ))}
        </div>
        <Note>
          <strong>How to read this.</strong> Materials are listed by number of tests, not by safety. Materials shown as non-flammable: {m.classification_rule.non_flammable}.{' '}
          {m.notes.join(' ')} BASS-II has no recorded pressure. Source: materials.json · <Doi doi={m.source_doi} />.
        </Note>
      </div>
    </Section>
  );
}
