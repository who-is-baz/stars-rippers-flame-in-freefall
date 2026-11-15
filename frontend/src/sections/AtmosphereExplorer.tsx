// "Custom" atmosphere explorer (Overview). Retrieval of OBSERVED FLEX tests near the chosen settings; not a
// simulation or a forecast. All numbers come from lib/explorer.ts over experiments.json, always with their n.
import { useDeferredValue, useId, useMemo, useState } from 'react';
import type { ExperimentRow, Fuel, Meta, Scenario } from '../data/types';
import type { Suppressant } from '../lib/filters';
import {
  flameState, globalRateScale, glowFor, matchTests, psiOf, snap, testedValues,
  type Crit, type FlameState, type MatchFilters, type MatchResult, type RateScale,
} from '../lib/explorer';
import { fmtTolerance } from '../lib/scenario';
import { QcChips, Warn } from '../components/ui';
import { SHORT_NAME } from '../components/Cards';

export const DISCLAIMER = 'Observed in NASA PSI tests. Not a simulation or a forecast.';
export const EMPTY_TEXT = 'No test within tolerance of these settings';
export const CONFOUND_TEXT = 'CO₂ and He are confounded with O₂';
export const BASS_NOTE = 'Solid materials (BASS-II) are not part of this explorer.';
const DISRUPTION_TIP = 'not defined by the source';

const pct = (f: number) => `${+(f * 100).toFixed(1)}%`;
const SIGN = { point: '', min: '≥', max: '≤' } as const;
export const fmtCrit = (o2: Crit, p: Crit) =>
  `${SIGN[o2.kind]}${pct(o2.value)} O₂ · ${SIGN[p.kind]}${+p.value.toFixed(1)} psi (${(p.value / 14.6959).toFixed(2)} atm)`;

export interface AtmosphereState {
  filters: MatchFilters;
  setFilters: (f: MatchFilters) => void;
  presetId: Scenario['id'] | null;
  applyPreset: (s: Scenario) => void;
  snapOn: boolean;
  setSnapOn: (v: boolean) => void;
  result: MatchResult;
  state: FlameState;
  glow: number | null;
  scale: RateScale;
  ranges: { o2: [number, number]; psi: [number, number] };
  tested: { o2: { value: number; n: number }[]; psi: { value: number; n: number }[] };
  pending: boolean;
}

/** State + memoized matching. useDeferredValue keeps the sliders responsive (403 rows, recomputed once per frame). */
export function useAtmosphere(rows: ExperimentRow[], meta: Meta): AtmosphereState {
  const flex = useMemo(() => rows.filter((r) => r.program === 'FLEX' && r.pressure_atm != null), [rows]);
  const ranges = useMemo(() => {
    const o2 = flex.map((r) => r.o2_fraction);
    const psi = flex.map((r) => psiOf(r.pressure_atm as number));
    return {
      o2: [Math.min(...o2), Math.max(...o2)] as [number, number],
      psi: [Math.floor(Math.min(...psi) * 10) / 10, Math.ceil(Math.max(...psi) * 10) / 10] as [number, number],
    };
  }, [flex]);
  const scale = useMemo(() => globalRateScale(rows), [rows]);
  const [filters, setFiltersRaw] = useState<MatchFilters>({
    fuel: 'any', suppressant: 'any', o2: { kind: 'point', value: 0.21 }, pressure_psi: { kind: 'point', value: 14.7 },
  });
  const [presetId, setPresetId] = useState<Scenario['id'] | null>('earth_iss');
  const [snapOn, setSnapOn] = useState(false);
  const setFilters = (f: MatchFilters) => { setFiltersRaw(f); setPresetId(null); };
  const applyPreset = (s: Scenario) => {
    setFiltersRaw((f) => ({ ...f, fuel: 'any', suppressant: 'any', o2: { ...s.criteria.o2 }, pressure_psi: { ...s.criteria.pressure_psi } }));
    setPresetId(s.id);
  };
  const deferred = useDeferredValue(filters);
  const result = useMemo(() => matchTests(rows, deferred, meta.tolerance), [rows, deferred, meta.tolerance]);
  const tested = useMemo(() => {
    const p = flex.filter((r) => (filters.fuel === 'any' || r.material_or_fuel === filters.fuel));
    return { o2: testedValues(p.map((r) => r.o2_fraction), 2), psi: testedValues(p.map((r) => psiOf(r.pressure_atm as number)), 1) };
  }, [flex, filters.fuel]);
  return {
    filters, setFilters, presetId, applyPreset, snapOn, setSnapOn, result,
    state: flameState(result, meta.min_n), glow: glowFor(result.meanRate, scale), scale, ranges, tested,
    pending: deferred !== filters,
  };
}

// ---------------------------------------------------------------- slider with density marks
function DataSlider({ label, min, max, step, value, crit, tested, fmt, valueText, onChange }: {
  label: string; min: number; max: number; step: number; value: number; crit: Crit['kind'];
  tested: { value: number; n: number }[]; fmt: (v: number) => string; valueText: string; onChange: (v: number) => void;
}) {
  const id = useId();
  const top = Math.max(1, ...tested.map((t) => t.n));
  const clamped = Math.min(max, Math.max(min, value));
  return (
    <div className="ax-slider">
      <div className="ax-slider-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="num">{SIGN[crit]}{fmt(value)}{value > max || value < min ? ' (outside tested range)' : ''}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={clamped} aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))} />
      <div className="ax-density" aria-hidden="true">
        {tested.filter((t) => t.value >= min && t.value <= max).map((t) => (
          <i key={t.value} title={`${fmt(t.value)}: ${t.n} tests`}
            style={{ left: `${((t.value - min) / (max - min)) * 100}%`, opacity: 0.25 + 0.75 * (t.n / top) }} />
        ))}
      </div>
      <div className="ax-range num" aria-hidden="true"><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
    </div>
  );
}

function Seg<T extends string>({ legend, value, options, onChange }: {
  legend: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="ax-seg">
      <legend>{legend}</legend>
      <div className="mini-seg">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------- readout text (pure, also used by the scene)
export function summaryText(m: MatchResult, state: FlameState, tolText: string): string {
  if (m.n === 0) return `${EMPTY_TEXT}.`;
  const parts = [`${m.n} FLEX tests within ${tolText}.`, `${m.byOutcome.extinction} of ${m.n} tests ended in extinction.`];
  if (state === 'small_n') parts.push('n < 5: too few tests to read a pattern.');
  else if (state === 'mixed') parts.push('Mixed outcomes.');
  if (m.meanRate != null) parts.push(`Observed mean burning rate ${m.meanRate.toFixed(2)} mm²/s (n = ${m.nRate}).`);
  return parts.join(' ');
}

const STATE_LABEL: Record<FlameState, string> = {
  stable: 'No test ended in extinction',
  mixed: 'Mixed outcomes',
  out: 'All matched tests ended in extinction',
  small_n: 'n < 5: shown in grey',
  empty: EMPTY_TEXT,
};

export function AtmosphereExplorer({ atm, scenarios, meta, onShowTests, onAsk, onClose }: {
  atm: AtmosphereState; scenarios: Scenario[]; meta: Meta;
  onShowTests: (ids: string[], label: string) => void; onAsk: (question: string) => void; onClose: () => void;
}) {
  const { filters: f, setFilters, result: m, state, ranges, tested, snapOn } = atm;
  const tolText = fmtTolerance(meta.tolerance);
  const set = (patch: Partial<MatchFilters>) => setFilters({ ...f, ...patch });
  const setO2 = (v: number) => set({ o2: { kind: 'point', value: snapOn ? snap(v, tested.o2) : Math.round(v * 1000) / 1000 } });
  const setPsi = (v: number) => set({ pressure_psi: { kind: 'point', value: snapOn ? snap(v, tested.psi) : Math.round(v * 10) / 10 } });
  const mixedSupp = Object.values(m.bySuppressant).filter((x) => x > 0).length > 1;
  const showConfound = f.suppressant === 'co2' || f.suppressant === 'he' || mixedSupp || (m.n > 0 && m.bySuppressant.none < m.n);
  const crit = fmtCrit(f.o2, f.pressure_psi);
  const fuelText = f.fuel === 'any' ? 'heptane and methanol' : f.fuel;
  const suppText = f.suppressant === 'any' ? 'any suppressant' : f.suppressant === 'none' ? 'no suppressant' : `${f.suppressant === 'co2' ? 'CO₂' : 'He'} added`;
  const question = `What did FLEX tests observe for ${fuelText} at ${crit}, ${suppText}?`;
  const preset = scenarios.find((s) => s.id === atm.presetId);
  const ids = [...new Set(m.tests.map((r) => r.test_id))];

  return (
    <section className="glass dock-explorer ax-panel" aria-label="Custom atmosphere explorer">
      <header className="dock-exp-bar">
        <strong style={{ fontSize: 'var(--fs-sm)', color: 'var(--mint)' }}>Custom atmosphere</strong>
        <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>FLEX fuel droplets · {BASS_NOTE}</span>
        <button type="button" className="icon-btn" style={{ marginLeft: 'auto' }} aria-label="Close custom explorer" onClick={onClose}>×</button>
      </header>

      <div className="ax-presets" role="group" aria-label="Atmosphere presets">
        {scenarios.map((s) => (
          <button key={s.id} type="button" className="ax-preset" aria-pressed={atm.presetId === s.id} onClick={() => atm.applyPreset(s)}
            title={`${s.label}: ${s.n_exact} exact · ${s.n_near} near (scenarios.json)`} aria-label={`${s.label}: ${s.n_exact} exact, ${s.n_near} near${s.verified ? '' : ', unverified source'}`}>
            <span>{SHORT_NAME[s.id] ?? s.label} <span className="num dim">{s.n_exact}/{s.n_near}</span></span>
            {!s.verified && <span className="ax-unverified">Unverified source</span>}
          </button>
        ))}
      </div>

      <div className="ax-body">
        <div className="ax-controls">
          <Seg legend="Fuel" value={f.fuel} onChange={(v) => set({ fuel: v as Fuel | 'any' })}
            options={[{ value: 'any', label: 'Both' }, { value: 'heptane', label: 'Heptane' }, { value: 'methanol', label: 'Methanol' }]} />
          <DataSlider label="Oxygen (O₂)" min={ranges.o2[0]} max={ranges.o2[1]} step={0.005} value={f.o2.value} crit={f.o2.kind}
            tested={tested.o2} fmt={(v) => `${pct(v)} O₂`} onChange={setO2}
            valueText={`${SIGN[f.o2.kind]}${pct(f.o2.value)} oxygen, ${m.n} matching tests`} />
          <DataSlider label="Pressure" min={ranges.psi[0]} max={ranges.psi[1]} step={0.1} value={f.pressure_psi.value} crit={f.pressure_psi.kind}
            tested={tested.psi} fmt={(v) => `${v.toFixed(1)} psi (${(v / 14.6959).toFixed(2)} atm)`} onChange={setPsi}
            valueText={`${SIGN[f.pressure_psi.kind]}${f.pressure_psi.value.toFixed(1)} psi, ${m.n} matching tests`} />
          <Seg legend="Suppressant (from recorded CO₂ / He fractions)" value={f.suppressant} onChange={(v) => set({ suppressant: v as Suppressant | 'any' })}
            options={[{ value: 'any', label: 'All' }, { value: 'none', label: 'None' }, { value: 'co2', label: 'CO₂' }, { value: 'he', label: 'He' }]} />
          <label className="ax-snap">
            <input type="checkbox" checked={snapOn} onChange={(e) => atm.setSnapOn(e.target.checked)} /> Snap to tested conditions
          </label>
        </div>

        <div className="ax-readout" aria-busy={atm.pending}>
          <p className="sr-only" role="status" aria-live="polite">{summaryText(m, state, tolText)}</p>
          <p className="ax-crit num">
            {crit} · tolerance {tolText}
            {preset && <> · preset: {preset.label} ({preset.n_exact} exact, {preset.n_near} near)</>}
          </p>
          {m.n === 0 ? (
            <div className="ax-empty">
              <p><strong>{EMPTY_TEXT}</strong>.</p>
              {m.nearest.length > 0 && <p className="dim">Closest tested conditions (these are not your settings):</p>}
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {m.nearest.map((c) => (
                  <button key={`${c.o2}-${c.pressure_psi}`} type="button" className="btn btn-sm"
                    onClick={() => set({ o2: { kind: 'point', value: c.o2 }, pressure_psi: { kind: 'point', value: c.pressure_psi } })}>
                    {pct(c.o2)} O₂ · {c.pressure_psi.toFixed(1)} psi · n = {c.n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="ax-big num">
                <b>{m.n}</b> tests{m.n_exact !== m.n && <> ({m.n_exact} exact, {m.n} near)</>}
                <span className={`ax-state ax-state-${state}`}> · {STATE_LABEL[state]}</span>
              </p>
              {state === 'small_n' && <Warn>n &lt; 5: too few tests to read a pattern. The flame is shown in grey.</Warn>}
              <ul className="ax-kv num">
                <li><span>Extinction</span><b>{m.byOutcome.extinction} of {m.n} tests ended in extinction</b></li>
                <li><span title={DISRUPTION_TIP}>Disruption <abbr title={DISRUPTION_TIP} aria-label={DISRUPTION_TIP}>ⓘ</abbr></span><b>{m.byOutcome.disruption}</b></li>
                <li><span>Completion</span><b>{m.byOutcome.completion}</b></li>
                <li><span>Burning rate</span><b>{m.meanRate != null ? `Observed mean burning rate ${m.meanRate.toFixed(2)} mm²/s (n = ${m.nRate})` : 'No burning rate recorded'}</b></li>
                <li><span>Extinction diameter</span><b>{m.meanExtDiameter != null ? `${m.meanExtDiameter.toFixed(2)} mm mean (n = ${m.nExtDiameter}, extinction tests only)` : 'No extinction diameter recorded'}</b></li>
                <li><span>QC flags</span><QcChips flags={m.qcFlags} /></li>
              </ul>
              {showConfound && (
                <p className="ax-note">
                  {CONFOUND_TEXT}. n by suppressant: none {m.bySuppressant.none} · CO₂ {m.bySuppressant.co2} · He {m.bySuppressant.he}
                </p>
              )}
            </>
          )}
          {m.excluded > 0 && <p className="dim ax-small">{m.excluded} FLEX test without recorded pressure is never matched.</p>}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" className="btn btn-sm btn-primary" disabled={m.n === 0} onClick={() => onShowTests(ids, `Custom: ${crit}`)}>
              Show {m.n} tests
            </button>
            <button type="button" className="btn btn-sm" onClick={() => onAsk(question)}>Ask the assistant about these settings</button>
          </div>
        </div>
      </div>
      <p className="ax-disclaimer">{DISCLAIMER}</p>
    </section>
  );
}
