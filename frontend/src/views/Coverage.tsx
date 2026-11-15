import { useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import type { CoverageCell, Fuel } from '../data/types';
import { useCoverage, useExperiments, useMeta, useScenarios } from '../data/useData';
import { hrefFor, type Location } from '../app/routes';
import { useExplainMode, useScenario } from '../providers';
import { CoverageGrid, N_LEGEND, cellKey, type Metric } from '../components/CoverageGrid';
import { Hint, Legend, NCount, Panel, SmallN, Sources, Warn } from '../components/kit';
import { fmtBand, fmtDiameter, fmtPct, fmtRate } from '../lib/format';
import { flagLabel } from '../lib/honesty';
import { glossary } from '../lib/glossary';
import { cellKeysFor, scenarioGroup } from '../lib/scenario';
import u from '../components/ui.module.css';
import s from './Coverage.module.css';

const FUELS: Fuel[] = ['heptane', 'methanol'];

function CellDetail({ c }: { c: CoverageCell }) {
  const { mode } = useExplainMode();
  const br = glossary('burning_rate', mode), ed = glossary('extinction_diameter', mode);
  const title = `${c.fuel === 'heptane' ? 'Heptane' : 'Methanol'} · ${fmtBand(c.o2_band)} · ${c.pressure_level}`;
  return (
    <Panel id="cell" title={title} footer={<><Sources dois={c.source_doi} /><NCount n={c.n} /></>}>
      {c.n === 0 ? (
        <p className={u.read}>No data available: no FLEX test was run in this cell. That gap is a finding, not an error.</p>
      ) : (
        <>
          <SmallN n={c.n} />
          {c.warning && <Warn>{c.warning}</Warn>}
          <dl className={u.kv}>
            <dt>Tests</dt><dd>{c.n} <span className={u.dim}>(no suppressant {c.n_by_suppressant.none} · CO₂ {c.n_by_suppressant.co2} · He {c.n_by_suppressant.he})</span></dd>
            <dt>{br.label}</dt><dd>{fmtRate(c.avg_burning_rate_mm2_s)} <span className={u.dim}>average, n = {c.n_burning_rate}</span></dd>
            <dt>Ended in extinction</dt><dd>{c.n_extinction} of {c.n}{c.pct_extinction != null && <> · {fmtPct(c.pct_extinction)}</>}</dd>
            <dt>{ed.label}</dt><dd>{fmtDiameter(c.avg_extinction_diameter_mm)} <span className={u.dim}>average, n = {c.n_extinction_diameter}</span></dd>
          </dl>
          {c.pct_note && <p className={u.dim}>Extinction share is {c.pct_note}: FLEX tests were chosen to approach the extinction limit.</p>}
          <Hint label={br.label} text={br.text} />
          {c.qc_flags.length > 0 && (
            <div>
              <p className={u.dim}>Data-quality notes in this cell</p>
              <ul className={u.flags}>{c.qc_flags.map((f) => <li key={f}>{flagLabel(f)}</li>)}</ul>
            </div>
          )}
          <a className={u.btnMint} href={hrefFor('explorer', { program: 'FLEX', fuel: c.fuel, o2_band: c.o2_band, pressure: c.pressure_level })}>
            Show these {c.n} tests
          </a>
        </>
      )}
    </Panel>
  );
}

export function Coverage({ loc }: { loc: Location }) {
  const meta = useMeta(), cov = useCoverage(), exp = useExperiments();
  const { scenarios } = useScenarios();
  const { scenarioId } = useScenario();
  const [metric, setMetric] = useState<Metric>('n');
  const [sel, setSel] = useState<string | null>(loc.params.get('cell'));
  const sc = scenarios.find((x) => x.id === (loc.params.get('scenario') ?? scenarioId));
  const { kind, group } = sc ? scenarioGroup(sc) : { kind: 'none' as const, group: null };
  const hl = cellKeysFor(group?.test_ids, exp.items, meta);
  const rates = cov.cells.map((c) => c.avg_burning_rate_mm2_s).filter((v): v is number => v != null);
  const domain: [number, number] = [Math.min(...rates), Math.max(...rates)];
  const selected = cov.cells.find((c) => cellKey(c) === sel) ?? null;

  const select = (c: CoverageCell) => {
    const k = cellKey(c);
    setSel(k);
    const p = new URLSearchParams(loc.params); p.set('cell', k);
    history.replaceState(null, '', `#/coverage?${p.toString()}`);
  };

  return (
    <div className={u.view}>
      <header className={u.head}>
        <h1 className={u.h1}>Which conditions were tested?</h1>
        <p className={u.lead}>FLEX droplet tests by oxygen band and pressure level, one map per fuel. Select a cell to see what it holds.</p>
        <p className={u.dim}>{cov.note}</p>
      </header>
      <div className={s.layout}>
        <Panel id="maps" title="Coverage map" icon={<Grid3x3 size={18} strokeWidth={1.5} />}
          footer={<><Sources dois={[...new Set(cov.cells.flatMap((c) => c.source_doi))]} /><NCount n={cov.n_tests} /></>}>
          <div role="group" aria-label="Color cells by" className={u.chips}>
            <button type="button" className={u.choice} aria-pressed={metric === 'n'} onClick={() => setMetric('n')}>Number of tests</button>
            <button type="button" className={u.choice} aria-pressed={metric === 'rate'} onClick={() => setMetric('rate')}>Average burning rate</button>
          </div>
          {sc && hl.size > 0 && (
            <p className={u.read}>
              Mint outline: cells holding the {group?.n} tests {kind === 'near' ? 'within tolerance of' : 'closest to (not matching)'} “{sc.label}”.
            </p>
          )}
          {FUELS.map((f) => (
            <CoverageGrid key={f} fuel={f} cells={cov.cells} meta={meta} metric={metric} highlight={hl} selected={sel} onSelect={select} rateDomain={domain} />
          ))}
          <Legend items={metric === 'n' ? N_LEGEND : [
            { label: `Lower (${domain[0].toFixed(2)} mm²/s)`, swatch: 'var(--seq-1)' }, { label: '', swatch: 'var(--seq-3)' },
            { label: `Higher (${domain[1].toFixed(2)} mm²/s)`, swatch: 'var(--seq-5)' }, { label: 'No tests', swatch: 'transparent', pattern: 'stripe' as const },
          ].filter((i) => i.label)} />
          <p className={u.dim}>{cov.n_cells_empty} empty cells · {cov.n_cells_small} cells with n &lt; {meta.min_n}. {meta.excluded_from_pressure_views.map((e) => `${e.test_id} excluded: ${e.reason}.`).join(' ')}</p>
        </Panel>
        <div className={s.side} aria-live="polite">
          {selected ? <CellDetail c={selected} /> : (
            <Panel id="cell-empty" title="Pick a cell"><p className={u.read}>Each cell shows how many tests were run there. Choose one to see its averages, their n, data-quality notes and the source.</p></Panel>
          )}
        </div>
      </div>
    </div>
  );
}
