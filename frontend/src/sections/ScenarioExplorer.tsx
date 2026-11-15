import { useState } from 'react';
import type { Outcome, Scenario, ScenarioMatch } from '../data/types';
import { useMeta, useScenarios } from '../data/useData';
import { useUi } from '../state/ui';
import { Badge, Doi, Section, Warn } from '../components/ui';
import { fmtO2Range, fmtPsi, fmtRange } from '../lib/format';
import { DISRUPTION_SHORT, MICROGRAVITY_NOTE, outcomeLabel } from '../lib/honesty';
import { fmtCriterionO2, fmtCriterionP, fmtTolerance } from '../lib/scenario';

const Unverified = () => (
  <Badge tone="caution" title="The cited source for this atmosphere has not been confirmed by the team yet">Unverified source</Badge>
);

function Breakdown({ m }: { m: ScenarioMatch }) {
  const fuels = Object.entries(m.n_by_fuel ?? {});
  const outcomes = Object.entries(m.n_by_outcome ?? {}) as [Outcome, number][];
  return (
    <dl className="kv">
      {m.o2_min != null && m.o2_max != null && (<><dt>O₂ tested</dt><dd>{fmtO2Range(m.o2_min, m.o2_max)}</dd></>)}
      {m.psi_min != null && m.psi_max != null && (<><dt>Pressure tested</dt><dd>{fmtRange(fmtPsi(m.psi_min), fmtPsi(m.psi_max))}</dd></>)}
      {fuels.length > 0 && (<><dt>By fuel (n)</dt><dd>{fuels.map(([f, n]) => `${f} ${n}`).join(' · ')}</dd></>)}
      {outcomes.length > 0 && (
        <><dt>Observed outcome (n)</dt>
          <dd>{outcomes.map(([o, n], i) => (
            <span key={o}>{i > 0 && ' · '}{outcomeLabel(o)} {n}{o === 'disruption' && <span className="dim"> ({DISRUPTION_SHORT})</span>}</span>
          ))}</dd></>
      )}
    </dl>
  );
}

function MatchBox({ title, hint, m, label, nearest }: { title: string; hint: string; m: ScenarioMatch; label: string; nearest?: boolean }) {
  const { showTests } = useUi();
  return (
    <div className={`match${nearest ? ' match-nearest' : ''}`}>
      <span className="label">{title}</span>
      <span className="big num">{m.n}<span className="sr-only"> tests</span></span>
      <span className="dim" style={{ fontSize: 'var(--fs-sm)' }}>{hint}</span>
      {m.n > 0 ? <Breakdown m={m} /> : <span className="nodata">No data: no FLEX test falls here.</span>}
      {m.n > 0 && m.test_ids && (
        <div><button type="button" className="btn btn-sm" onClick={() => showTests({ ids: m.test_ids, label })}>View these {m.n} tests</button></div>
      )}
    </div>
  );
}

function Detail({ s }: { s: Scenario }) {
  const tol = fmtTolerance(s.criteria.tolerance);
  return (
    <article className="glass card stack" aria-labelledby="scn-detail-title" data-testid={`scenario-${s.id}`}>
      <div className="row">
        <h3 id="scn-detail-title" className="h" style={{ fontSize: 'var(--fs-lg)' }}>{s.label}</h3>
        {!s.verified && <Unverified />}
      </div>
      <dl className="kv">
        <dt>Atmosphere</dt><dd>{fmtCriterionO2(s)} at {fmtCriterionP(s)}</dd>
        <dt>Cited source</dt><dd>{s.source}</dd>
        <dt>Test data</dt><dd>FLEX · <Doi doi={s.source_doi} /> · scenarios.json</dd>
      </dl>
      {s.quote && <blockquote className="quote">&ldquo;{s.quote}&rdquo;</blockquote>}
      {s.note && <p className="dim" style={{ fontSize: 'var(--fs-sm)' }}>{s.note}</p>}
      <div className="grid-2">
        <MatchBox title="Exact match" hint="FLEX tests that meet this atmosphere as stated" m={s.exact} label={`${s.label}: exact match`} />
        <MatchBox title="Near match" hint={`FLEX tests within tolerance (${tol}). They are close to this atmosphere, not at it.`} m={s.near}
          label={`${s.label}: near match (within tolerance)`} />
      </div>
      {s.nearest && (
        <MatchBox nearest title="Closest tested condition — not this scenario"
          hint={`${s.nearest.note} Distance: ${s.nearest.distance_in_tolerances} tolerances away.`} m={s.nearest}
          label={`Closest tested condition to "${s.label}" (not this scenario)`} />
      )}
      {s.n_exact === 0 && (
        <Warn>
          No test was run at this atmosphere. Any tests listed above are microgravity tests in a nearby atmosphere on the ISS;
          they are not tests of this scenario.
        </Warn>
      )}
      <p className="dim" style={{ fontSize: 'var(--fs-sm)' }}>
        {s.bass2_o2_only && <>BASS-II: {s.bass2_o2_only.n} tests match by O₂ only. {s.bass2_o2_only.note} </>}
        {s.excluded.length > 0 && <>Excluded: {s.excluded.map((e) => `${e.test_id} (${e.reason})`).join(', ')}.</>}
      </p>
    </article>
  );
}

export function ScenarioExplorer() {
  const { scenarios } = useScenarios();
  const meta = useMeta();
  const [id, setId] = useState<Scenario['id']>(scenarios[0]?.id ?? 'earth_iss');
  const current = scenarios.find((s) => s.id === id) ?? scenarios[0];
  return (
    <Section id="scenarios" eyebrow="Scenario explorer" title="Which atmospheres were actually tested?"
      lead={<>Pick an atmosphere. Each card shows how many FLEX tests match it exactly, and how many are only near it
        (within {fmtTolerance(meta.tolerance)}). {MICROGRAVITY_NOTE}</>}>
      <div className="stack">
        <div className="scn-list" role="group" aria-label="Atmosphere scenarios">
          {scenarios.map((s) => (
            <button key={s.id} type="button" className="glass scn-card" aria-pressed={s.id === id} onClick={() => setId(s.id)}>
              <span className="t">{s.label}</span>
              <span className="c">{fmtCriterionO2(s)} · {fmtCriterionP(s)}</span>
              {!s.verified && <span><Unverified /></span>}
              <span className="scn-counts">
                <span><b className="num">{s.n_exact}</b>exact</span>
                <span><b className="num">{s.n_near}</b>near</span>
              </span>
            </button>
          ))}
        </div>
        {current ? <Detail s={current} /> : <p className="nodata">No data: scenarios.json has no scenarios.</p>}
      </div>
    </Section>
  );
}
