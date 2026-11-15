import { useState } from 'react';
import type { CoverageCell, Fuel, PressureLevel } from '../data/types';
import { useCoverage, useMeta } from '../data/useData';
import { Badge, Dois, Note, Provisional, Section, Segmented } from '../components/ui';
import { BurningRateChartSvg } from '../components/charts';
import { fmtBand, fmtDiameter, fmtRate } from '../lib/format';
import { CONFOUND_NOTE, DESCRIPTIVE_ONLY, isSmallN } from '../lib/honesty';

const FUELS: Fuel[] = ['heptane', 'methanol'];
type Metric = 'rate' | 'diameter';

// One value with its own n, a proportional bar, and the n<min_n treatment. Means come straight from coverage.json.
function Value({ cell, metric, max, minN }: { cell: CoverageCell | undefined; metric: Metric; max: number; minN: number }) {
  const value = cell ? (metric === 'rate' ? cell.avg_burning_rate_mm2_s : cell.avg_extinction_diameter_mm) : null;
  const n = cell ? (metric === 'rate' ? cell.n_burning_rate : cell.n_extinction_diameter) : 0;
  if (!cell || value == null) return <td><span className="nodata">No data</span></td>;
  const small = isSmallN(n, minN);
  const barColor = cell.fuel === 'heptane' ? 'var(--fuel-heptane)' : 'var(--fuel-methanol)';
  return (
    <td>
      <span className="num">{metric === 'rate' ? fmtRate(value) : fmtDiameter(value)}</span>{' '}
      <span className="dim num">n = {n}</span>{' '}
      {small && <Badge tone="caution">⚠ n &lt; {minN}</Badge>}
      <div className={`bar${small ? ' bar-muted' : ''}`} aria-hidden="true">
        <i style={{ width: `${Math.round((value / max) * 100)}%`, background: small ? undefined : barColor }} />
      </div>
    </td>
  );
}

export function FuelComparison() {
  const coverage = useCoverage();
  const meta = useMeta();
  const [level, setLevel] = useState<PressureLevel>('~1.0 atm');
  const [metric, setMetric] = useState<Metric>('rate');
  const [chartMode, setChartMode] = useState<'line' | 'bars'>('line');
  const find = (fuel: Fuel, band: string) => coverage.cells.find((c) => c.fuel === fuel && c.o2_band === band && c.pressure_level === level);
  const all = coverage.cells.map((c) => (metric === 'rate' ? c.avg_burning_rate_mm2_s : c.avg_extinction_diameter_mm)).filter((v): v is number => v != null);
  const max = Math.max(...all, Number.EPSILON);
  const dois = [...new Set(coverage.cells.flatMap((c) => c.source_doi))];

  return (
    <Section id="fuels" eyebrow="Fuel comparison" title="Heptane and methanol, side by side" badge={<Provisional />}
      lead={<>Mean burning rate and mean extinction diameter per tested condition, each with its own n. This is a description
        of what was measured, not a ranking and not a forecast.</>}>
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <Segmented label="Measurement" value={metric} onChange={setMetric}
              options={[{ value: 'rate', label: 'Mean burning rate' }, { value: 'diameter', label: 'Mean extinction diameter' }]} />
            <Segmented label="Pressure level" value={level} onChange={setLevel}
              options={meta.pressure_levels.map((p) => ({ value: p.label, label: p.label }))} />
          </div>
          <Segmented label="Visual chart" value={chartMode} onChange={setChartMode}
            options={[{ value: 'line', label: 'Line chart' }, { value: 'bars', label: 'Grouped bars' }]} />
        </div>

        {/* Visual SVG Chart paired with the semantic accessible table below */}
        <div className="glass card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="chart-key" style={{ margin: 0 }}>
              <span><b style={{ background: 'var(--fuel-heptane)' }} /> Heptane</span>
              <span><b style={{ background: 'var(--fuel-methanol)' }} /> Methanol</span>
              <span><b style={{ background: 'transparent', border: '1.5px solid var(--caution)' }} /> Small sample (n &lt; {meta.min_n})</span>
            </div>
            <span className="src-pill">FLEX · PSI-69 · {level}</span>
          </div>
          <BurningRateChartSvg
            cells={coverage.cells}
            bands={meta.o2_bands}
            pressureLevel={level}
            metric={metric}
            mode={chartMode}
            minN={meta.min_n}
          />
        </div>

        <div className="glass card scroll-x">
          <table className="data" data-testid="fuel-table">
            <caption>
              {metric === 'rate' ? 'Mean burning rate (mm²/s)' : 'Mean extinction diameter (mm), extinction tests only'} at {level} · FLEX ·{' '}
              <strong>{DESCRIPTIVE_ONLY}</strong>
            </caption>
            <thead>
              <tr>
                <th scope="col">O₂ band</th>
                {FUELS.map((f) => <th key={f} scope="col" style={{ textTransform: 'capitalize', width: '38%' }}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {meta.o2_bands.map((b) => (
                <tr key={b.label}>
                  <th scope="row">{fmtBand(b.label)}</th>
                  {FUELS.map((f) => <Value key={f} cell={find(f, b.label)} metric={metric} max={max} minN={meta.min_n} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          <strong>{DESCRIPTIVE_ONLY}.</strong> {coverage.note} {CONFOUND_NOTE} Bars share one scale across all pressure levels.
          Source: coverage.json · <Dois dois={dois} />.
        </Note>
      </div>
    </Section>
  );
}
