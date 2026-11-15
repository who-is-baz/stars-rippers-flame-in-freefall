// Board cards (widgets). One question, one view, one reading line, source + n (flame-dashboard-builder §2).
// Every figure is read from the JSON files; the browser only counts and formats.
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeftRight, ArrowUpRight, ChevronDown, ChevronUp, Ellipsis, Flame, Info, Layers, Minimize2, Maximize2, Sparkles, Target, Trash2,
} from 'lucide-react';
import type { Fuel, Scenario } from '../data/types';
import { useAnswers, useCoverage, useExperiments, useGaps, useMaterials, useMeta, useScenarios } from '../data/useData';
import { useUi } from '../state/ui';
import { useCustom } from '../state/custom';
import { useActiveAtmosphere } from '../state/atmosphere';
import { DISCLAIMER_INTERPRETATION, describeRanked, interpret } from '../lib/interpretation';
import { RELEVANCE_LABEL } from '../lib/relevance';
import { cardMeta, sideOf, useBoard, type CardType, type ViewId } from '../state/board';
import { Doi } from './ui';
import { BurningRateChartSvg, CoverageRadarSvg, KpiRingSvg, MatchRingSvg, OutcomeBarsSvg, OutcomePills } from './charts';
import { O2BandBars, OutcomesDonut, ScatterKey, TestsMixBars, TestsMixDonut, TestsScatterSvg, flexWithRate, type ColorBy } from './dataCharts';
import { useCountUp } from '../lib/useCountUp';
import { fmtCriterionO2, fmtCriterionP, fmtTolerance } from '../lib/scenario';
import { isSmallN } from '../lib/honesty';

export const SHORT_NAME: Record<Scenario['id'], string> = {
  earth_iss: 'Earth / ISS',
  lunar_challenge: 'Moon base',
  lunar_nasa: 'NASA lunar habitat',
  exploration: 'Exploration',
  suit: 'Spacesuit',
};
const SUBTITLE_NAME: Record<Scenario['id'], string> = {
  earth_iss: 'Sea-level & ISS reference',
  lunar_challenge: 'Challenge estimate',
  lunar_nasa: 'Nominal habitat spec',
  exploration: 'Exploration atmosphere',
  suit: 'EVA suit criteria',
};

export function MiniFlameThumb({ o2 }: { o2: number }) {
  const r = Math.min(23, Math.max(14, Math.round(13 + o2 * 20)));
  return (
    <div className="thumb" aria-hidden="true">
      <svg width="54" height="54" viewBox="0 0 54 54">
        <defs>
          <radialGradient id="miniFlameGrad">
            <stop offset="0" stopColor="#F7F9FF" />
            <stop offset="0.4" stopColor="#7C96FF" />
            <stop offset="1" stopColor="#26324F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="27" cy="27" r={r} fill="url(#miniFlameGrad)" />
        <circle cx="27" cy="27" r="2.6" fill="#0b0e14" stroke="#E6EAF0" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

// ---- "How to read this" text (ⓘ) ----
const HOW: Record<CardType, { explorer: string; engineer: string }> = {
  interpretation: {
    explorer: 'Which recorded tests are closest to this air, what they show, and what the data cannot tell us. It describes records; it does not judge safety.',
    engineer: 'Tests ordered by distance in tolerance units, max(|ΔO₂|/tol, |Δpsi|/tol); counts of outcomes among exact and near tests with n; the list of open uncertainties is computed from the selected atmosphere.',
  },
  scenario_match: {
    explorer: 'Compares each ISS fire test with this atmosphere. Sensors vary a little, so we count exact matches and tests that are close.',
    engineer: 'FLEX droplet tests counted against the scenario criteria. "Close" relaxes each bound by one tolerance (see scenarios.json).',
  },
  scenario_inspector: {
    explorer: 'The air a crew could breathe in this setting, next to Earth air. The flame in the middle scales with the oxygen level (illustration).',
    engineer: 'Criteria come from scenarios.json. Flame size is an illustration scaled by O₂ fraction, not a simulation.',
  },
  outcomes: {
    explorer: 'What happened in the nearby tests: flame went out, burned to the end, or something else. Counts, not chances.',
    engineer: 'Observed outcome counts for the near-match set. Extinction share is descriptive, not a probability. "Disruption" is not defined by the source.',
  },
  burning_rate: {
    explorer: 'How fast the fuel droplet burned at about normal air pressure, for each oxygen band. Bands with few tests are marked.',
    engineer: 'Mean burning-rate constant K (mm²/s) per O₂ band at ~1.0 atm from coverage.json. CO₂/He suppressants are mixed with O₂ effects.',
  },
  coverage: {
    explorer: 'Each point is a condition (oxygen and pressure) that was tested. Gaps in the shape are conditions with no test.',
    engineer: 'FLEX cells by O₂ band × pressure level. Click a point to open those tests. n < 5 cells are marked unstable.',
  },
  materials: {
    explorer: 'Solid materials burned in the BASS-II experiment. Only some tests have a stated outcome in the source notes.',
    engineer: 'Counts per material_category. Outcomes were extracted by AI from free text and await review. "Not stated" does not mean the flame did not go out.',
  },
  gaps: {
    explorer: 'What this data cannot tell us. Where there is no test, the answer is "No data", never an estimate.',
    engineer: 'First entries of gaps.json. The full list and the limitations that apply to every number are in the Gaps view.',
  },
  tests_scatter: {
    explorer: 'Each dot is one real FLEX test: how much oxygen it had (across) and how fast the fuel burned (up). No line is drawn through them.',
    engineer: 'FLEX tests with a recorded burning rate K (mm²/s) vs O₂ fraction. Pressures and CO₂/He suppressants are mixed; hover a dot for its test ID.',
  },
  o2_bands: {
    explorer: 'How many tests were run at each oxygen level, for each fuel. Bars with a warning have very few tests.',
    engineer: 'FLEX row counts per O₂ band (meta.o2_bands) and fuel. n < min_n is outlined and marked. Counts only.',
  },
  tests_mix: {
    explorer: 'How many tests of each kind are in this dashboard. FLEX burned fuel droplets; BASS-II burned small solid samples.',
    engineer: 'Row counts from experiments.json by program and fuel. BASS-II is context only and is not compared with FLEX.',
  },
  answer: {
    explorer: 'Ready-made answers written from the NASA data, each with its source. Open the SI assistant to ask your own question.',
    engineer: 'Precomputed answers from answers.json (level Basic, no model). Citations list the query and DOI behind each figure.',
  },
  kpi: {
    explorer: 'How much of the data is filled in: tests with a stated outcome and conditions that were actually tested.',
    engineer: 'BASS-II outcome-stated count (materials.json) and FLEX tested cells (coverage.json). Counts only.',
  },
};

// ---- card frame: header (question, ⓘ, ⋯ menu) + body + footer ----
function CardMenu({ type }: { type: CardType }) {
  const { board, move, switchSide, remove, toggleCollapse } = useBoard();
  const { openView } = useUi();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const side = sideOf(board, type);
  const list = side ? board[side] : [];
  const i = list.indexOf(type);
  const collapsed = board.collapsed.includes(type);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const act = (fn: () => void) => () => { fn(); setOpen(false); };
  return (
    <div className="cmenu" ref={ref}>
      <button type="button" className="icon-btn" aria-label="Card options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Ellipsis size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="cmenu-pop glass" role="menu">
          {cardMeta(type).view && (
            <button type="button" role="menuitem" onClick={act(() => openView?.(cardMeta(type).view as ViewId))}><Maximize2 size={13} aria-hidden="true" /> Open full view</button>
          )}
          <button type="button" role="menuitem" onClick={act(() => toggleCollapse(type))}>
            {collapsed ? <ChevronDown size={13} aria-hidden="true" /> : <Minimize2 size={13} aria-hidden="true" />} {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button type="button" role="menuitem" disabled={i <= 0} onClick={act(() => move(type, 'up'))}><ChevronUp size={13} aria-hidden="true" /> Move up</button>
          <button type="button" role="menuitem" disabled={i < 0 || i >= list.length - 1} onClick={act(() => move(type, 'down'))}><ChevronDown size={13} aria-hidden="true" /> Move down</button>
          <button type="button" role="menuitem" onClick={act(() => switchSide(type))}><ArrowLeftRight size={13} aria-hidden="true" /> Move to {side === 'left' ? 'right' : 'left'}</button>
          <button type="button" role="menuitem" className="danger" onClick={act(() => remove(type))}><Trash2 size={13} aria-hidden="true" /> Remove</button>
        </div>
      )}
    </div>
  );
}

function Frame({ type, icon, children, src, n, warn, extra, swapKey }: {
  type: CardType; icon: ReactNode; children: ReactNode; src: ReactNode; n?: ReactNode; warn?: ReactNode; extra?: ReactNode; swapKey?: string;
}) {
  const { board } = useBoard();
  const { mode = 'explorer', openView } = useUi();
  const [info, setInfo] = useState(false);
  const meta = cardMeta(type);
  const collapsed = board.collapsed.includes(type);
  const by = board.addedBy[type];
  return (
    <article className={`glass wc${collapsed ? ' wc-collapsed' : ''}${by === 'si' ? ' wc-si-added' : ''}`} aria-label={meta.title}>
      <div className="wc-hd">
        <span className="wc-icon" aria-hidden="true">{icon}</span>
        <h2>{meta.title}</h2>
        {by === 'si' && <span className="bysi-badge">Added by SI</span>}
        {!collapsed && (
          <button type="button" className="icon-btn" aria-label="How to read this card" aria-expanded={info} onClick={() => setInfo((v) => !v)}>
            <Info size={12} aria-hidden="true" />
          </button>
        )}
        {!collapsed && meta.view && (
          <button type="button" className="icon-btn" aria-label="Open full view" onClick={() => openView?.(meta.view as ViewId)}>
            <ArrowUpRight size={12} aria-hidden="true" />
          </button>
        )}
        <CardMenu type={type} />
      </div>
      {!collapsed && (
        <>
          {extra && <div className="wc-subbar">{extra}</div>}
          {info ? <p className="wc-read">{HOW[type][mode]}</p> : <div className="wc-body" key={swapKey}>{children}</div>}
          <div className="wc-ft num">
            <span className="src-pill">{src}</span>
            {warn ?? (n != null ? <span>{n}</span> : null)}
          </div>
        </>
      )}
    </article>
  );
}

// ---- individual cards ----
function useCurrent() {
  const { scenarios } = useScenarios();
  const { scenarioId } = useUi();
  const idx = Math.max(0, scenarios.findIndex((s) => s.id === scenarioId));
  return { scenarios, current: scenarios[idx] ?? scenarios[0], idx };
}

// While the Custom explorer is open, scenario cards say they still show the preset (not the Custom settings).
function usePresetNote(current: Scenario | undefined): ReactNode {
  const { active } = useCustom();
  return active && current ? <span className="warn-text">Preset {SHORT_NAME[current.id]} · not Custom</span> : undefined;
}

function MatchCard() {
  const meta = useMeta();
  const { current } = useCurrent();
  const presetNote = usePresetNote(current);
  const [detail, setDetail] = useState<'ring' | 'fuel'>('ring');
  const nearShown = useCountUp(current?.n_near ?? 0);
  const flex = meta.programs.find((p) => p.program === 'FLEX');
  const tol = fmtTolerance(meta.tolerance);
  if (!current) return null;
  const fuels = current.n_near > 0 ? current.near.n_by_fuel : current.nearest?.n_by_fuel;
  return (
    <Frame type="scenario_match" swapKey={`${current.id}-${detail}`} icon={<Flame size={13} />} src={<>FLEX · {flex?.psi_id ?? 'PSI-69'}</>} n={`Tol. ${tol}`}
      warn={presetNote}
      extra={<ViewToggle label="Match view" value={detail} onChange={setDetail} a={['ring', 'Ring']} b={['fuel', 'By fuel']} />}>
      {detail === 'ring' ? (
        <div className="ring-row">
          <MatchRingSvg exact={current.n_exact} near={current.n_near} total={flex?.n ?? 274} minN={meta.min_n} />
          <div>
            <div className="wc-big num">{nearShown} <small>{current.n_exact > 0 ? 'within tol.' : 'near'}</small></div>
            <div className="dim num" style={{ fontSize: 'var(--fs-xs)' }}>{current.n_exact} exact {current.n_exact === 1 ? 'match' : 'matches'}</div>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <div className="dim num" style={{ fontSize: 'var(--fs-xs)' }}>
            <strong style={{ color: 'var(--ink)' }}>{nearShown}</strong> near · <strong style={{ color: 'var(--ink)' }}>{current.n_exact}</strong> exact matches
          </div>
          <div className="outcome-pills num">
            <span className="out-pill"><i style={{ background: 'var(--fuel-heptane)' }} />Heptane <b>{fuels?.heptane ?? 0}</b></span>
            <span className="out-pill"><i style={{ background: 'var(--fuel-methanol)' }} />Methanol <b>{fuels?.methanol ?? 0}</b></span>
          </div>
        </div>
      )}
    </Frame>
  );
}

function InspectorCard() {
  const { showTests, openView } = useUi();
  const { items } = useExperiments();
  const { current, idx, scenarios } = useCurrent();
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const custom = useCustom();
  if (!current) return null;
  if (custom.active && custom.summary) {
    const c = custom.summary;
    return (
      <Frame type="scenario_inspector" swapKey="custom" icon={<Target size={13} />} src={<>FLEX · PSI-69</>} n="Custom">
        <div className="insp-head">
          <div>
            <h3>Custom settings</h3>
            <small>Observed FLEX tests only</small>
          </div>
        </div>
        <div className="insp-kv num">
          <div><span>Atmosphere</span><b>{c.atmosphere}</b></div>
          <div><span>Fuel</span><b>{c.fuel}</b></div>
          <div><span>Suppressant</span><b>{c.suppressant}</b></div>
          <div><span>Exact · Near</span><b className={c.n === 0 ? 'warn-text' : undefined}>{c.n_exact} · {c.n} tests</b></div>
        </div>
        {c.n > 0 ? (
          <button type="button" className="cta-mint" onClick={() => showTests({ ids: c.ids, label: `Custom: ${c.atmosphere}` })}>Show {c.n} tests</button>
        ) : (
          <p className="wc-read">No test within tolerance of these settings. No data.</p>
        )}
      </Frame>
    );
  }
  const ids = current.n_near > 0 ? current.near.test_ids : current.nearest?.test_ids;
  const count = current.n_near > 0 ? current.n_near : current.nearest?.n ?? 0;
  const out = current.n_near > 0 ? current.near.n_by_outcome : current.nearest?.n_by_outcome;
  const label = `${SHORT_NAME[current.id]}: ${current.n_exact > 0 ? 'matching' : 'near-match'} tests`;
  const idSet = new Set(ids ?? []);
  const matchedRows = items.filter((r) => idSet.has(r.test_id));

  const handleShowClick = () => {
    if (!ids || count === 0) return;
    const reqLabel = current.n_near > 0 ? label : `Closest tested condition to ${SHORT_NAME[current.id]} (not this scenario)`;
    showTests({ ids, label: reqLabel });
    setInlineOpen((v) => !v);
  };

  return (
    <Frame type="scenario_inspector" swapKey={current.id} icon={<Target size={13} />} src={<>FLEX · PSI-69</>} n={`${String(idx + 1).padStart(2, '0')} / ${String(scenarios.length).padStart(2, '0')}`}
      extra={
        <>
          {!current.verified && <span className="badge badge-caution">Unverified</span>}
          <button
            type="button"
            className="rail-help"
            style={{ padding: '2px 8px', fontSize: 10 }}
            aria-pressed={showOutcomes}
            onClick={() => setShowOutcomes((v) => !v)}
          >
            {showOutcomes ? 'Hide outcomes' : '+ Outcomes'}
          </button>
        </>
      }>
      <div className="insp-head">
        <MiniFlameThumb o2={current.criteria.o2.value} />
        <div>
          <h3>{SHORT_NAME[current.id] ?? current.label}</h3>
          <small>{SUBTITLE_NAME[current.id] ?? current.label}</small>
        </div>
      </div>
      <div className="insp-kv num">
        <div><span>Oxygen</span><b>{fmtCriterionO2(current).replace(' O₂', '')}</b></div>
        <div><span>Pressure</span><b>{fmtCriterionP(current)}</b></div>
        <div><span>Earth ref.</span><b>21% · 14.7 psi</b></div>
        <div><span>Exact · Near</span><b className={current.n_near === 0 ? 'warn-text' : undefined}>{current.n_exact} · {current.n_near} tests</b></div>
      </div>
      {showOutcomes && <OutcomePills outcomes={out} />}
      {ids && count > 0 ? (
        <>
          <button type="button" className="cta-mint" aria-expanded={inlineOpen} onClick={handleShowClick}>
            {inlineOpen ? 'Hide ' : 'Show '}{count} {current.n_exact === 0 ? 'closest ' : ''}tests{current.n_near === 0 ? ' (not this scenario)' : ''}
          </button>
          {inlineOpen && matchedRows.length > 0 && (
            <div className="insp-inline-tests" role="region" aria-label="Consulted tests preview">
              <div className="insp-inline-hd num">
                <span>{matchedRows.length} tests ({current.n_near > 0 ? 'within tolerance' : 'closest condition'})</span>
                <button type="button" className="toast-undo" onClick={() => openView?.('explore')}>Full table ↗</button>
              </div>
              <ul className="insp-inline-list num">
                {matchedRows.slice(0, 6).map((r) => (
                  <li key={r.test_id}>
                    <b className="mono">{r.test_id}</b>
                    <span>{r.material_or_fuel}</span>
                    <span>{Math.round(r.o2_fraction * 100)}% O₂</span>
                    <span className="dim">{r.outcome ?? 'n/s'}</span>
                  </li>
                ))}
              </ul>
              {matchedRows.length > 6 && (
                <div className="dim num" style={{ fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                  + {matchedRows.length - 6} more shown in the center explorer panel
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="wc-read">No FLEX test is near this atmosphere. No data.</p>
      )}
    </Frame>
  );
}

function ViewToggle<T extends string>({ value, onChange, a, b, label }: { value: T; onChange: (v: T) => void; a: [T, string]; b: [T, string]; label: string }) {
  return (
    <div className="mini-seg" role="group" aria-label={label}>
      <button type="button" aria-pressed={value === a[0]} onClick={() => onChange(a[0])}>{a[1]}</button>
      <button type="button" aria-pressed={value === b[0]} onClick={() => onChange(b[0])}>{b[1]}</button>
    </div>
  );
}

function OutcomesCard() {
  const meta = useMeta();
  const { current } = useCurrent();
  const presetNote = usePresetNote(current);
  const [view, setView] = useState<'bars' | 'pie'>('bars');
  if (!current) return null;
  const out = current.n_near > 0 ? current.near.n_by_outcome : current.nearest?.n_by_outcome;
  const total = current.n_near || current.nearest?.n || 0;
  return (
    <Frame type="outcomes" swapKey={`${current.id}-${view}`} icon={<Layers size={13} />} src={<>FLEX · PSI-69</>} n={`n = ${total}`} warn={presetNote}
      extra={<ViewToggle label="Chart type" value={view} onChange={setView} a={['bars', 'Bars']} b={['pie', 'Pie']} />}>
      {total === 0 ? <p className="nodata">No data for this atmosphere.</p> : view === 'pie' ? <OutcomesDonut outcomes={out} total={total} /> : <OutcomeBarsSvg outcomes={out} total={total} minN={meta.min_n} />}
      <p className="wc-read">Observed outcomes near {SHORT_NAME[current.id]}. &ldquo;Disruption&rdquo; is not defined by the source.</p>
      <OutcomePills outcomes={out} />
    </Frame>
  );
}

function BurningRateCard() {
  const meta = useMeta();
  const coverage = useCoverage();
  const { mode = 'explorer' } = useUi();
  const [view, setView] = useState<'bars' | 'line'>('bars');
  const small = coverage.cells.filter((c) => c.pressure_level === '~1.0 atm' && c.n_burning_rate > 0 && isSmallN(c.n_burning_rate, meta.min_n)).length;
  return (
    <Frame type="burning_rate" icon={<Flame size={13} />} src={<>FLEX · PSI-69</>}
      warn={small > 0 ? <span className="warn-text">⚠ {small} points with n &lt; {meta.min_n}</span> : undefined}
      extra={
        <div className="mini-seg" role="group" aria-label="Chart type">
          <button type="button" aria-pressed={view === 'bars'} onClick={() => setView('bars')}>Bars</button>
          <button type="button" aria-pressed={view === 'line'} onClick={() => setView('line')}>Line</button>
        </div>
      }>
      <div className="chart-key">
        <span><b style={{ background: 'var(--fuel-heptane)' }} /> Heptane</span>
        <span><b style={{ background: 'var(--fuel-methanol)' }} /> Methanol</span>
        <span className="mono">~1.0 atm · mm²/s</span>
      </div>
      <BurningRateChartSvg cells={coverage.cells} bands={meta.o2_bands} pressureLevel="~1.0 atm" metric="rate" mode={view} minN={meta.min_n} compact />
      {mode === 'engineer' && <p className="wc-read">Mean K (mm²/s) at ~1.0 atm. Descriptive; suppressants mixed.</p>}
    </Frame>
  );
}

function CoverageCard() {
  const meta = useMeta();
  const coverage = useCoverage();
  const { showTests } = useUi();
  const [fuel, setFuel] = useState<Fuel>('heptane');
  const cells = coverage.cells.filter((c) => c.fuel === fuel);
  const tested = cells.filter((c) => c.n > 0).length;
  return (
    <Frame type="coverage" icon={<Target size={13} />} src={<>FLEX · PSI-69</>} n={`${tested} of ${cells.length} conditions tested`}
      extra={
        <div className="mini-seg" role="group" aria-label="Radar fuel">
          <button type="button" aria-pressed={fuel === 'heptane'} onClick={() => setFuel('heptane')}>Hept</button>
          <button type="button" aria-pressed={fuel === 'methanol'} onClick={() => setFuel('methanol')}>Meth</button>
        </div>
      }>
      <CoverageRadarSvg cells={coverage.cells} fuel={fuel} bands={meta.o2_bands} pressures={meta.pressure_levels} minN={meta.min_n}
        onSelectCell={(cell) => showTests({ program: 'FLEX', fuel: cell.fuel, o2Band: cell.o2_band, pressure: cell.pressure_level })} />
    </Frame>
  );
}

function MaterialsCard() {
  const m = useMaterials();
  const maxN = Math.max(1, ...m.materials.map((x) => x.n));
  const stated = m.materials.reduce((s, x) => s + x.n_with_outcome, 0);
  const rows = [...m.materials].sort((a, b) => b.n - a.n).slice(0, 4);
  return (
    <Frame type="materials" icon={<Layers size={13} />} src={<>BASS-II · PSI-25</>} n={`${stated} of ${m.n_tests} with outcome`}>
      <ul className="mat-list">
        {rows.map((x) => (
          <li key={x.material_category}>
            <span className="mono">{x.material_category}</span>
            <span className="num dim">{x.n_with_outcome} stated · {x.n} tests</span>
            <div className="bar" aria-hidden="true"><i style={{ width: `${Math.round((x.n / maxN) * 100)}%`, background: 'var(--prog-bass2)' }} /></div>
          </li>
        ))}
      </ul>
      <p className="wc-read">Counts only. AI-extracted outcomes await review; &ldquo;not stated&rdquo; does not mean no flame.</p>
    </Frame>
  );
}

function InterpretationCard() {
  const { items } = useExperiments();
  const meta = useMeta();
  const atm = useActiveAtmosphere();
  const { showTests, openView } = useUi();
  const [all, setAll] = useState(false);
  const i = useMemo(() => (atm ? interpret(items, atm, meta) : null), [items, atm, meta]);
  if (!atm || !i) return null;
  const shown = all ? i.unresolved : i.unresolved.slice(0, 2);
  const link = (l: 'gaps' | 'sources') => openView?.(l);
  const fuels = Object.entries(i.useful.byFuel).map(([f, n]) => `${f} ${n}`).join(', ');
  return (
    <Frame type="interpretation" swapKey={atm.label} icon={<Sparkles size={13} />} src={<>FLEX · BASS-II</>} n={atm.source === 'custom' ? 'Custom' : undefined}>
      <section className="interp-block" aria-label="Useful evidence">
        <h3>Useful evidence</h3>
        {i.useful.top.length > 0 ? (
          <>
            <ol className="interp-list num">{i.useful.top.map((r) => <li key={`${r.row.program}${r.row.test_id}${r.row.pressure_atm}`} title={describeRanked(r)}>{r.row.test_id} · {r.row.material_or_fuel} · {RELEVANCE_LABEL[r.relevance]}</li>)}</ol>
            <p className="dim num">{i.matched.length} FLEX tests within tolerance{fuels ? `: ${fuels}` : ''}.{i.bassO2.n > 0 ? ` ${i.bassO2.n} BASS-II at this O₂.` : ''} <button type="button" className="ind-link" onClick={() => showTests({ ids: i.matched.map((r) => r.row.test_id), label: `${atm.label}: tests within tolerance` })}>Open in Experiments</button></p>
          </>
        ) : (
          <>
            <p className="warn-text">No matching tests.</p>
            {i.useful.closest.length > 0 && <ul className="interp-list num">{i.useful.closest.map((c) => <li key={`${c.o2}-${c.pressure_psi}`}>Closest tested: {+(c.o2 * 100).toFixed(1)}% O₂ · {c.pressure_psi.toFixed(1)} psi · n = {c.n} (not this atmosphere)</li>)}</ul>}
          </>
        )}
      </section>
      <section className="interp-block" aria-label="What the nearest tests show">
        <h3>What the nearest tests show</h3>
        <p className={i.nearestShows.small || i.nearestShows.n === 0 ? 'dim' : undefined}>{i.nearestShows.text}</p>
      </section>
      <section className="interp-block" aria-label="What remains unresolved">
        <h3>What remains unresolved</h3>
        <ul className="interp-list">
          {shown.map((u) => (
            <li key={u.id}>{u.text} <button type="button" className="ind-link" onClick={() => link(u.link)}>{u.link === 'gaps' ? 'Gaps' : 'Methods'}</button></li>
          ))}
        </ul>
        {i.unresolved.length > 2 && <button type="button" className="ind-link" aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `+${i.unresolved.length - 2} more`}</button>}
      </section>
      <p className="interp-note">{DISCLAIMER_INTERPRETATION}</p>
    </Frame>
  );
}

function GapsCard() {
  const { gaps } = useGaps();
  return (
    <Frame type="gaps" icon={<span>∅</span>} src={<>PSI-69 · PSI-25</>} n={`${gaps.length} gaps · See all`}>
      <ul className="glist">
        <li>0g ISS only — no Moon or Mars gravity data</li>
        <li>No test below 10.2 psi or above 34% O₂</li>
      </ul>
    </Frame>
  );
}

function KpiCard() {
  const meta = useMeta();
  const coverage = useCoverage();
  const m = useMaterials();
  const bass = meta.programs.find((p) => p.program === 'BASS-II');
  const stated = m.materials.reduce((s, x) => s + x.n_with_outcome, 0);
  return (
    <Frame type="kpi" icon={<Layers size={13} />} src={<>meta · coverage · materials</>} n={`${meta.n_tests} tests`}>
      <div className="kpi-stack">
        <KpiRingSvg num={coverage.n_cells - coverage.n_cells_empty} den={coverage.n_cells} label="FLEX conditions tested" />
        <KpiRingSvg num={stated} den={bass?.n ?? m.n_tests} label="BASS-II outcomes stated" />
      </div>
    </Frame>
  );
}

function ScatterCard() {
  const { items } = useExperiments();
  const [by, setBy] = useState<ColorBy>('fuel');
  const n = flexWithRate(items).length;
  return (
    <Frame type="tests_scatter" icon={<Target size={13} />} src={<>FLEX · PSI-69</>} n={`n = ${n} tests`}
      extra={
        <div className="mini-seg" role="group" aria-label="Color by">
          <button type="button" aria-pressed={by === 'fuel'} onClick={() => setBy('fuel')}>Fuel</button>
          <button type="button" aria-pressed={by === 'outcome'} onClick={() => setBy('outcome')}>Result</button>
        </div>
      }>
      <ScatterKey by={by} />
      <TestsScatterSvg rows={items} by={by} />
      <p className="wc-read">One dot per test; no trend line.</p>
    </Frame>
  );
}

function MixCard() {
  const { items } = useExperiments();
  const meta = useMeta();
  const [view, setView] = useState<'bars' | 'pie'>('pie');
  return (
    <Frame type="tests_mix" swapKey={view} icon={<Layers size={13} />} src={<>meta · experiments</>} n={`${items.length} rows · ${meta.programs.length} programs`}
      extra={<ViewToggle label="Chart type" value={view} onChange={setView} a={['bars', 'Bars']} b={['pie', 'Pie']} />}>
      {view === 'pie' ? <TestsMixDonut rows={items} /> : <TestsMixBars rows={items} />}
      <p className="wc-read">BASS-II is shown for context and is not compared with FLEX.</p>
    </Frame>
  );
}

function O2BandsCard() {
  const { items } = useExperiments();
  const meta = useMeta();
  return (
    <Frame type="o2_bands" icon={<Layers size={13} />} src={<>FLEX · PSI-69</>} n={`min n = ${meta.min_n}`}>
      <div className="chart-key">
        <span><b style={{ background: 'var(--fuel-heptane)' }} /> Heptane</span>
        <span><b style={{ background: 'var(--fuel-methanol)' }} /> Methanol</span>
      </div>
      <O2BandBars rows={items} bands={meta.o2_bands} minN={meta.min_n} />
      <p className="wc-read">Outlined bars with ⚠ have fewer than {meta.min_n} tests.</p>
    </Frame>
  );
}

function AnswerCard() {
  const { answers } = useAnswers();
  const { openAssistant } = useUi();
  const list = answers.filter((a) => a.question);
  const [id, setId] = useState(list.find((a) => a.id === 'q06')?.id ?? list[0]?.id);
  const a = list.find((x) => x.id === id) ?? list[0];
  if (!a) return null;
  const cite = a.citations[0];
  const text = a.answer.length > 190 ? `${a.answer.slice(0, 187).trimEnd()}…` : a.answer;
  return (
    <Frame type="answer" swapKey={a.id} icon={<Sparkles size={13} />} src={cite ? <>Basic · <Doi doi={cite.source_doi} /></> : <>Basic · no model</>}
      warn={a.no_data ? <span className="warn-text">No data</span> : undefined}>
      <label className="sr-only" htmlFor="answer-pick">Choose a question</label>
      <select id="answer-pick" className="answer-pick" value={a.id} onChange={(e) => setId(e.target.value)}>
        {list.map((x) => <option key={x.id} value={x.id}>{x.question}</option>)}
      </select>
      <p className="wc-read answer-text">{text}</p>
      {a.warnings && a.warnings.length > 0 && <p className="wc-read warn-text">⚠ {a.warnings[0]}</p>}
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => openAssistant(a.question)}>Full answer in the SI assistant →</button>
    </Frame>
  );
}

export const BoardCard = memo(function BoardCard({ type }: { type: CardType }) {
  switch (type) {
    case 'scenario_match': return <MatchCard />;
    case 'scenario_inspector': return <InspectorCard />;
    case 'outcomes': return <OutcomesCard />;
    case 'burning_rate': return <BurningRateCard />;
    case 'coverage': return <CoverageCard />;
    case 'materials': return <MaterialsCard />;
    case 'gaps': return <GapsCard />;
    case 'interpretation': return <InterpretationCard />;
    case 'kpi': return <KpiCard />;
    case 'tests_scatter': return <ScatterCard />;
    case 'tests_mix': return <MixCard />;
    case 'answer': return <AnswerCard />;
    case 'o2_bands': return <O2BandsCard />;
  }
});
