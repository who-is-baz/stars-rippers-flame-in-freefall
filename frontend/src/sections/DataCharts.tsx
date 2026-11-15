import { useMemo, useState, type ReactNode } from 'react';
import { useCoverage, useExperiments, useMeta } from '../data/useData';
import { Dois, Provisional, Section, Segmented } from '../components/ui';
import {
  O2BandBars, OutcomesByFuelSvg, OutcomesDonut, PressureBars, ScatterKey, SuppressantDonut, TestsMixBars, TestsMixDonut, TestsScatterSvg,
  flexWithRate, type ColorBy,
} from '../components/dataCharts';
import { CONFOUND_NOTE, DISRUPTION_SHORT } from '../lib/honesty';
import type { Outcome } from '../data/types';

function ChartCard({ title, controls, note, src, children }: { title: string; controls?: ReactNode; note?: ReactNode; src: string; children: ReactNode }) {
  return (
    <article className="glass card stack chart-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="h">{title}</h3>
        {controls}
      </div>
      {children}
      {note && <p className="dim" style={{ fontSize: 'var(--fs-xs)' }}>{note}</p>}
      <span className="src-pill" style={{ alignSelf: 'start' }}>{src}</span>
    </article>
  );
}

type ChartGroup = 'essential' | 'outcomes' | 'conditions' | 'all';

// Charts of the whole data set. Counts and individual tests only: no fit, no average, no forecast.
export function DataCharts() {
  const { items } = useExperiments();
  const meta = useMeta();
  const coverage = useCoverage();
  const [group, setGroup] = useState<ChartGroup>('essential');
  const [by, setBy] = useState<ColorBy>('fuel');
  const [outcomeView, setOutcomeView] = useState<'stacked' | 'donut'>('stacked');
  const [mixView, setMixView] = useState<'bars' | 'donut'>('donut');
  const nRate = flexWithRate(items).length;
  const flexOutcomes = useMemo(() => {
    const by: Partial<Record<Outcome, number>> = {};
    let total = 0;
    for (const r of items) if (r.program === 'FLEX' && r.outcome) { by[r.outcome] = (by[r.outcome] ?? 0) + 1; total += 1; }
    return { by, total };
  }, [items]);

  const showScatter = group === 'essential' || group === 'all';
  const showOutcomes = group === 'essential' || group === 'outcomes' || group === 'all';
  const showMix = group === 'outcomes' || group === 'all';
  const showO2Bands = group === 'essential' || group === 'conditions' || group === 'all';
  const showPressureAndGas = group === 'conditions' || group === 'all';

  return (
    <Section id="charts" eyebrow="Data charts" title={`Visual telemetry across ${items.length} tests`} badge={<Provisional />}
      lead={<>Real test points and counts only — no fitted line, no forecast. Filter which chart group to display below.</>}>
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Segmented
            label="Chart group"
            value={group}
            onChange={setGroup}
            options={[
              { value: 'essential', label: 'Key charts (3)' },
              { value: 'outcomes', label: 'Outcomes & mix (2)' },
              { value: 'conditions', label: 'O₂, pressure & gas (3)' },
              { value: 'all', label: 'All charts (6)' },
            ]}
          />
        </div>

        {showScatter && (
          <article className="glass card stack chart-card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 className="h">Every test: oxygen vs burning rate</h3>
              <div className="row">
                <ScatterKey by={by} />
                <Segmented label="Color by" value={by} onChange={setBy} options={[{ value: 'fuel', label: 'Fuel' }, { value: 'outcome', label: 'Result' }]} />
              </div>
            </div>
            <TestsScatterSvg rows={items} by={by} w={1000} h={220} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="src-pill">FLEX · PSI-69</span>
              <span className="dim num" style={{ fontSize: 'var(--fs-xs)' }}>n = {nRate} tests with a recorded burning rate</span>
            </div>
          </article>
        )}

        <div className="grid-charts">
          {showOutcomes && (
            <ChartCard title="How FLEX tests ended" src="FLEX · PSI-69" note={<>Counts, not probabilities. &ldquo;Disruption&rdquo; is {DISRUPTION_SHORT}.</>}
              controls={<Segmented label="Chart type" value={outcomeView} onChange={setOutcomeView} options={[{ value: 'stacked', label: 'Bars' }, { value: 'donut', label: 'Pie' }]} />}>
              {outcomeView === 'donut' ? <OutcomesDonut outcomes={flexOutcomes.by} total={flexOutcomes.total} /> : <OutcomesByFuelSvg rows={items} />}
            </ChartCard>
          )}

          {showMix && (
            <ChartCard title="What the data set contains" src="meta · experiments" note="BASS-II is context only and is not compared with FLEX."
              controls={<Segmented label="Chart type" value={mixView} onChange={setMixView} options={[{ value: 'bars', label: 'Bars' }, { value: 'donut', label: 'Pie' }]} />}>
              {mixView === 'donut' ? <TestsMixDonut rows={items} /> : <TestsMixBars rows={items} />}
            </ChartCard>
          )}

          {showO2Bands && (
            <ChartCard title="How many tests per oxygen level?" src="FLEX · PSI-69" note={<>Bars outlined with ⚠ have fewer than {meta.min_n} tests.</>}>
              <div className="chart-key">
                <span><b style={{ background: 'var(--fuel-heptane)' }} /> Heptane</span>
                <span><b style={{ background: 'var(--fuel-methanol)' }} /> Methanol</span>
              </div>
              <O2BandBars rows={items} bands={meta.o2_bands} minN={meta.min_n} w={420} h={190} />
            </ChartCard>
          )}

          {showPressureAndGas && (
            <>
              <ChartCard title="How many tests per pressure level?" src="coverage.json" note="BASS-II has no recorded pressure, so it is not here.">
                <PressureBars cells={coverage.cells} levels={meta.pressure_levels} />
              </ChartCard>

              <ChartCard title="Which gas was added to put the flame out?" src="FLEX · PSI-69" note="CO₂ and helium are confounded with oxygen in these tests; this only counts them.">
                <SuppressantDonut rows={items} />
              </ChartCard>
            </>
          )}
        </div>

        <details className="glass compact-details">
          <summary>Descriptive-only &amp; confounding notes</summary>
          <p style={{ marginTop: 8, fontSize: 'var(--fs-xs)', color: 'var(--ink-2)' }}>
            <strong>Descriptive only:</strong> pressures and suppressants are mixed. {CONFOUND_NOTE} Source: experiments.json · coverage.json · <Dois dois={meta.source_doi} />.
          </p>
        </details>
      </div>
    </Section>
  );
}
