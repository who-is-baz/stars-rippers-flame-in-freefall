import { Grid3x3, ListChecks, Target, Wind } from 'lucide-react';
import type { Outcome, Scenario } from '../data/types';
import { useCoverage, useExperiments, useMeta, useScenarios } from '../data/useData';
import { hrefFor } from '../app/routes';
import { useExplainMode, useScenario } from '../providers';
import { CoverageGrid, N_LEGEND } from '../components/CoverageGrid';
import { Hint, Legend, NCount, Panel, SmallN, SourceChip, Warn } from '../components/kit';
import { fmtO2Range, fmtPsi, fmtRange } from '../lib/format';
import { DISRUPTION_NOTE, outcomeLabel } from '../lib/honesty';
import { glossary } from '../lib/glossary';
import { cellKeysFor, fmtCriterionO2, fmtCriterionP, fmtTolerance, scenarioGroup } from '../lib/scenario';
import { Scene } from './Scene';
import u from '../components/ui.module.css';
import s from './Overview.module.css';

const OUT_COLOR: Record<Outcome, string> = {
  extinction: 'var(--out-extinction)', disruption: 'var(--out-disruption)', completion: 'var(--out-completion)',
  blowoff: 'var(--out-blowoff)', no_ignition: 'var(--out-noflame)', not_sustained: 'var(--out-noflame)',
};

const testsHref = (ids: string[] | undefined) => hrefFor('explorer', { program: 'FLEX', ids: (ids ?? []).join(',') });

function Inspector({ sc }: { sc: Scenario }) {
  const meta = useMeta();
  const { mode } = useExplainMode();
  const tol = glossary('tolerance', mode);
  return (
    <Panel id="insp" title="What air are we looking at?" icon={<Wind size={18} strokeWidth={1.5} />}
      footer={<><SourceChip doi={sc.source_doi} /><span>{sc.source}</span></>}>
      <div>
        <p className={s.scLabel}>{sc.label}</p>
        <p className={u.dim}>{fmtCriterionO2(sc)} · {fmtCriterionP(sc)}</p>
      </div>
      {!sc.verified && <Warn>Source pending verification.</Warn>}
      {sc.n_exact === 0 && (
        <p className={s.hypo}>Hypothetical: no test was run exactly at this air.</p>
      )}
      <dl className={u.kv}>
        <dt>Exact match</dt><dd>{sc.n_exact} tests</dd>
        <dt>Within tolerance</dt><dd>{sc.n_near} tests <span className={u.dim}>({fmtTolerance(meta.tolerance)})</span></dd>
        {sc.bass2_o2_only && <><dt>BASS-II, O₂ only</dt><dd>{sc.bass2_o2_only.n} tests <span className={u.dim}>— {sc.bass2_o2_only.note}</span></dd></>}
      </dl>
      <Hint label={tol.label} text={tol.text} />
      {sc.n_near === 0 && sc.nearest && (
        <div className={u.amber} role="note">
          <strong>Closest tested condition — it is NOT this scenario</strong>
          <span className={u.read}>
            {fmtO2Range(sc.nearest.o2_min ?? 0, sc.nearest.o2_max ?? 0)} · {fmtRange(fmtPsi(sc.nearest.psi_min ?? 0), fmtPsi(sc.nearest.psi_max ?? 0))} · {sc.nearest.pressure_level}
          </span>
          <span className={u.dim}>{sc.nearest.note}</span>
          <a className={u.btn} href={testsHref(sc.nearest.test_ids)}>Show {sc.nearest.n} closest tests</a>
        </div>
      )}
      {sc.quote && <blockquote className={u.quote}>“{sc.quote}”</blockquote>}
      {sc.note && <p className={u.dim}>{sc.note}</p>}
      <div className={u.chips}>
        {sc.n_near > 0 && <a className={u.btnMint} href={testsHref(sc.near.test_ids)}>Show {sc.n_near} tests</a>}
        <a className={u.btn} href={hrefFor('coverage', { scenario: sc.id })}>See it on the coverage map</a>
      </div>
    </Panel>
  );
}

function MatchCard({ sc }: { sc: Scenario }) {
  const reading =
    sc.n_exact > 0 ? `${sc.n_exact} match exactly; ${sc.n_near} are within tolerance.`
      : sc.n_near > 0 ? `None exactly; ${sc.n_near} are within tolerance.`
        : 'None, not even within tolerance. The inspector shows the closest tested condition.';
  return (
    <Panel id="c-match" title="How many tests match this air?" icon={<Target size={18} strokeWidth={1.5} />}
      footer={<><SourceChip doi={sc.source_doi} /><NCount n={sc.n_near} /></>}>
      <p className={s.nums}>
        <span><span className={u.big}>{sc.n_exact}</span><span className={u.unit}>exact</span></span>
        <span><span className={u.big}>{sc.n_near}</span><span className={u.unit}>within tolerance</span></span>
      </p>
      <p className={u.read}>{reading}</p>
      <SmallN n={sc.n_near} />
    </Panel>
  );
}

function OutcomesCard({ sc }: { sc: Scenario }) {
  const { kind, group } = scenarioGroup(sc);
  const { mode } = useExplainMode();
  const dis = glossary('disruption', mode);
  if (!group) {
    return <Panel id="c-out" title="How did those tests end?" icon={<ListChecks size={18} strokeWidth={1.5} />}><p className={u.read}>No data available: no tests to describe.</p></Panel>;
  }
  const entries = Object.entries(group.n_by_outcome ?? {}) as [Outcome, number][];
  return (
    <Panel id="c-out" title="How did those tests end?" icon={<ListChecks size={18} strokeWidth={1.5} />}
      footer={<><SourceChip doi={sc.source_doi} /><NCount n={group.n} /></>}>
      {kind === 'nearest' && <Warn>Closest tested condition, not this scenario.</Warn>}
      <ul className={u.bars}>
        {entries.map(([o, n]) => (
          <li key={o} className={u.bar}>
            <span>{outcomeLabel(o)}{o === 'disruption' && <span className={u.dim} title={DISRUPTION_NOTE}> *</span>}</span>
            <span className={u.track}><span className={u.fill} style={{ width: `${(n / group.n) * 100}%`, background: OUT_COLOR[o] }} /></span>
            <span className={u.dim}>{n}</span>
          </li>
        ))}
      </ul>
      <p className={u.read}>Counts of how each test ended; not a rate.</p>
      {entries.some(([o]) => o === 'disruption') && <Hint label={`* ${dis.label}`} text={`${dis.text} (${DISRUPTION_NOTE}.)`} />}
      <SmallN n={group.n} />
    </Panel>
  );
}

function MiniCoverageCard({ sc }: { sc: Scenario }) {
  const meta = useMeta(), cov = useCoverage(), exp = useExperiments();
  const { group } = scenarioGroup(sc);
  const hl = cellKeysFor(group?.test_ids, exp.items, meta);
  return (
    <Panel id="c-cov" title="Which conditions were tested?" icon={<Grid3x3 size={18} strokeWidth={1.5} />}
      footer={<><SourceChip doi={meta.programs.find((p) => p.program === 'FLEX')?.source_doi ?? ''} /><NCount n={cov.n_tests} /></>}>
      <div className={s.minis}>
        <CoverageGrid fuel="heptane" cells={cov.cells} meta={meta} mini highlight={hl} />
        <CoverageGrid fuel="methanol" cells={cov.cells} meta={meta} mini highlight={hl} />
      </div>
      <p className={u.read}>{cov.n_cells_empty} of {cov.n_cells} fuel × O₂ × pressure cells have no tests. Mint outline: cells holding this scenario’s tests.</p>
      <Legend items={[{ label: 'Heptane', swatch: 'var(--fuel-heptane)' }, { label: 'Methanol', swatch: 'var(--fuel-methanol)' }, ...N_LEGEND.slice(0, 2)]} />
      <a className={u.btn} href={hrefFor('coverage', { scenario: sc.id })}>Open the coverage map</a>
    </Panel>
  );
}

export function Overview() {
  const meta = useMeta();
  const { scenarios } = useScenarios();
  const { scenarioId, setScenarioId } = useScenario();
  const { mode } = useExplainMode();
  const sc = scenarios.find((x) => x.id === scenarioId) ?? scenarios[0];
  const micro = glossary('microgravity', mode);
  return (
    <div className={u.view}>
      <div className={s.top}>
        <div className={s.intro}>
          <h1 className={u.h1}>Fire behaves differently in space.</h1>
          <p className={u.lead}>
            Explore {meta.n_tests} NASA fire tests from the ISS ({meta.programs.map((p) => `${p.n} ${p.program}`).join(', ')}) and see
            what they say — and don’t say — about spacecraft and Moon-base air.
          </p>
          <Hint label={micro.label} text={micro.text} />
          <div role="group" aria-label="Choose an atmosphere" className={s.picker}>
            <span className={u.dim}>Choose an atmosphere</span>
            <div className={u.chips}>
              {scenarios.map((x) => (
                <button key={x.id} type="button" className={u.choice} aria-pressed={x.id === sc.id} onClick={() => setScenarioId(x.id)}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
          <Scene scenario={sc} />
        </div>
        <Inspector sc={sc} />
      </div>
      <p className="sr-only" aria-live="polite">{`${sc.label}: ${sc.n_exact} exact, ${sc.n_near} within tolerance.`}</p>
      <div className={s.cards}>
        <MatchCard sc={sc} />
        <OutcomesCard sc={sc} />
        <MiniCoverageCard sc={sc} />
      </div>
    </div>
  );
}
