import { useState } from 'react';
import type { CoverageCell, Fuel } from '../data/types';
import { useCoverage, useMeta } from '../data/useData';
import { useUi } from '../state/ui';
import { Dois, Note, QcChips, Section, Segmented, Warn } from '../components/ui';
import { fmtBand, fmtDiameter, fmtRate } from '../lib/format';
import { CONFOUND_NOTE, isSmallN } from '../lib/honesty';

const FUELS: { value: Fuel; label: string }[] = [
  { value: 'heptane', label: 'Heptane' }, { value: 'methanol', label: 'Methanol' },
];
const keyOf = (c: Pick<CoverageCell, 'o2_band' | 'pressure_level'>) => `${c.o2_band}|${c.pressure_level}`;

function CellButton({ cell, maxN, minN, selected, onSelect }: {
  cell: CoverageCell; maxN: number; minN: number; selected: boolean; onSelect: () => void;
}) {
  const where = `${fmtBand(cell.o2_band)}, ${cell.pressure_level}`;
  if (cell.n === 0) {
    return (
      <button type="button" className="cell cell-empty" aria-pressed={selected} onClick={onSelect} aria-label={`${where}: No data`}>
        <span className="n">No data</span>
      </button>
    );
  }
  const small = isSmallN(cell.n, minN);
  return (
    <button type="button" className={`cell${small ? ' cell-small' : ''}`} aria-pressed={selected} onClick={onSelect}
      style={small ? undefined : { ['--i' as string]: (cell.n / maxN).toFixed(2) }}
      aria-label={`${where}: n = ${cell.n}${small ? `, warning: fewer than ${minN} tests` : ''}`}>
      <span className="n num">n = {cell.n}</span>
      <span className="s">{small ? `⚠ n < ${minN}` : 'tests'}</span>
    </button>
  );
}

function CellDetail({ cell, minN }: { cell: CoverageCell; minN: number }) {
  const { showTests } = useUi();
  const title = `${cell.fuel} · ${fmtBand(cell.o2_band)} · ${cell.pressure_level}`;
  if (cell.n === 0) {
    return (
      <div className="glass card stack" role="region" aria-live="polite" aria-label="Cell detail">
        <h3 className="h">{title}</h3>
        <p className="nodata">No data: no FLEX test was run in this combination. This is a gap, not a zero.</p>
      </div>
    );
  }
  const small = isSmallN(cell.n, minN);
  const sup = cell.n_by_suppressant;
  return (
    <div className="glass card stack" role="region" aria-live="polite" aria-label="Cell detail">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="h">{title} · n = {cell.n}</h3>
        <button type="button" className="btn btn-sm"
          onClick={() => showTests({ program: 'FLEX', fuel: cell.fuel, o2Band: cell.o2_band, pressure: cell.pressure_level })}>
          View these tests in the table
        </button>
      </div>
      {small && <Warn>{cell.warning ?? `n < ${minN}: small sample`}</Warn>}
      <div className="metrics">
        <div className="metric">
          <span className="label">Ended in extinction</span>
          <b className="num">{cell.pct_extinction == null ? 'No data' : `${cell.pct_extinction}%`}</b>
          <small>{cell.n_extinction} of n = {cell.n} tests · {cell.pct_note ?? 'descriptive, not a probability'}</small>
        </div>
        <div className="metric">
          <span className="label">Mean burning rate</span>
          <b className="num">{fmtRate(cell.avg_burning_rate_mm2_s)}</b>
          <small>n = {cell.n_burning_rate} tests with a burning rate</small>
        </div>
        <div className="metric">
          <span className="label">Mean extinction diameter</span>
          <b className="num">{fmtDiameter(cell.avg_extinction_diameter_mm)}</b>
          <small>n = {cell.n_extinction_diameter} extinction tests with a diameter</small>
        </div>
        <div className="metric">
          <span className="label">Suppressant mix (n)</span>
          <b className="num" style={{ fontSize: 'var(--fs-md)' }}>none {sup.none} · CO₂ {sup.co2} · He {sup.he}</b>
          <small>mixed inside this cell</small>
        </div>
      </div>
      <dl className="kv">
        <dt>QC flags</dt><dd><QcChips flags={cell.qc_flags} /></dd>
        <dt>Source</dt><dd><Dois dois={cell.source_doi} /> · coverage.json</dd>
      </dl>
    </div>
  );
}

export function CoverageMap() {
  const coverage = useCoverage();
  const meta = useMeta();
  const [fuel, setFuel] = useState<Fuel>('heptane');
  const [selected, setSelected] = useState<string | null>(null);
  const cells = coverage.cells.filter((c) => c.fuel === fuel);
  const byKey = new Map(cells.map((c) => [keyOf(c), c]));
  const maxN = Math.max(1, ...coverage.cells.map((c) => c.n));
  const current = selected ? byKey.get(selected) : undefined;
  const excluded = meta.excluded_from_pressure_views.map((e) => `${e.test_id} (${e.reason})`).join(', ');

  return (
    <Section id="coverage" eyebrow="Coverage map" title="Where the tests are, and where they are not"
      lead={<>FLEX tests counted by O₂ band and pressure level, one fuel at a time. Colour shows only how many tests exist.
        Select a cell for its details. {coverage.n_tests} tests in the grid{excluded && <>; excluded: {excluded}</>}.</>}>
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Segmented label="Fuel" value={fuel} options={FUELS} onChange={(f) => { setFuel(f); setSelected(null); }} />
          <div className="legend" aria-hidden="true">
            <span><i style={{ background: 'rgba(var(--flame-rgb), .12)' }} />fewer tests</span>
            <span><i style={{ background: 'rgba(var(--flame-rgb), .47)' }} />more tests</span>
            <span><i style={{ background: 'var(--muted-cell)' }} />n &lt; {meta.min_n} (warning)</span>
            <span><i style={{ background: 'var(--nodata-cell)' }} />No data</span>
          </div>
        </div>
        <div className="glass card scroll-x">
          <table className="heat">
            <caption className="sr-only">Number of FLEX {fuel} tests by O₂ band (columns) and pressure level (rows)</caption>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Pressure level</span></th>
                {meta.o2_bands.map((b) => <th key={b.label} scope="col">{fmtBand(b.label)}</th>)}
              </tr>
            </thead>
            <tbody>
              {meta.pressure_levels.map((p) => (
                <tr key={p.label}>
                  <th scope="row">{p.label}</th>
                  {meta.o2_bands.map((b) => {
                    const k = `${b.label}|${p.label}`;
                    const cell = byKey.get(k);
                    return (
                      <td key={k}>
                        {cell
                          ? <CellButton cell={cell} maxN={maxN} minN={meta.min_n} selected={selected === k} onSelect={() => setSelected(k)} />
                          : <div className="cell cell-empty"><span className="n">No data</span></div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {current
          ? <CellDetail cell={current} minN={meta.min_n} />
          : <p className="dim" aria-live="polite">Select a cell to see its tests, means and warnings.</p>}
        <Note><strong>Reading O₂ bands:</strong> {CONFOUND_NOTE} {coverage.note}</Note>
      </div>
    </Section>
  );
}
