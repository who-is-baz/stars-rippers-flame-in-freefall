import { useState } from 'react';
import type { CoverageCell, Fuel, PressureLevel } from '../data/types';
import { useCoverage, useMeta } from '../data/useData';
import { Badge, Dois, Note, Provisional, Section, Segmented } from '../components/ui';
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
  return (
    <td>
      <span className="num">{metric === 'rate' ? fmtRate(value) : fmtDiameter(value)}</span>{' '}
      <span className="dim num">n = {n}</span>{' '}
      {small && <Badge tone="caution">⚠ n &lt; {minN}</Badge>}
      <div className={`bar${small ? ' bar-muted' : ''}`} aria-hidden="true"><i style={{ width: `${Math.round((value / max) * 100)}%` }} /></div>
    </td>
  );
}

export function FuelComparison() {
  const coverage = useCoverage();
  const meta = useMeta();
  const [level, setLevel] = useState<PressureLevel>('~1.0 atm');
  const [metric, setMetric] = useState<Metric>('rate');
  const find = (fuel: Fuel, band: string) => coverage.cells.find((c) => c.fuel === fuel && c.o2_band === band && c.pressure_level === level);
  const all = coverage.cells.map((c) => (metric === 'rate' ? c.avg_burning_rate_mm2_s : c.avg_extinction_diameter_mm)).filter((v): v is number => v != null);
  const max = Math.max(...all, Number.EPSILON);
  const dois = [...new Set(coverage.cells.flatMap((c) => c.source_doi))];

  return (
    <Section id="fuels" eyebrow="Fuel comparison" title="Heptane and methanol, side by side" badge={<Provisional />}
      lead={<>Mean burning rate and mean extinction diameter per tested condition, each with its own n. This is a description
        of what was measured, not a ranking and not a forecast.</>}>
      <div className="stack">
        <div className="row">
          <Segmented label="Measurement" value={metric} onChange={setMetric}
            options={[{ value: 'rate', label: 'Mean burning rate' }, { value: 'diameter', label: 'Mean extinction diameter' }]} />
          <Segmented label="Pressure level" value={level} onChange={setLevel}
            options={meta.pressure_levels.map((p) => ({ value: p.label, label: p.label }))} />
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
