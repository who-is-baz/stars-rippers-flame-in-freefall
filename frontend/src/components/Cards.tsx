// Board cards (widgets). One question, one view, one reading line, source + n (flame-dashboard-builder §2).
// Every figure is read from the JSON files; the browser only counts and formats.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeftRight, ArrowUpRight, ChevronDown, ChevronUp, Ellipsis, Flame, Info, Layers, Minimize2, Maximize2, Target, Trash2,
} from 'lucide-react';
import type { Fuel, Scenario } from '../data/types';
import { useCoverage, useGaps, useMaterials, useMeta, useScenarios } from '../data/useData';
import { useUi } from '../state/ui';
import { cardMeta, sideOf, useBoard, type CardType } from '../state/board';
import { Doi } from './ui';
import { BurningRateChartSvg, CoverageRadarSvg, KpiRingSvg, MatchRingSvg, OutcomeBarsSvg, OutcomePills } from './charts';
import { fmtCriterionO2, fmtCriterionP, fmtTolerance } from '../lib/scenario';
import { isSmallN, MICROGRAVITY_NOTE } from '../lib/honesty';

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
          <button type="button" role="menuitem" onClick={act(() => openView?.(cardMeta(type).view))}><Maximize2 size={13} aria-hidden="true" /> Open full view</button>
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

function Frame({ type, icon, children, src, n, warn, extra }: {
  type: CardType; icon: ReactNode; children: ReactNode; src: ReactNode; n?: ReactNode; warn?: ReactNode; extra?: ReactNode;
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
        {!collapsed && extra}
        {!collapsed && (
          <button type="button" className="icon-btn" aria-label="How to read this card" aria-expanded={info} onClick={() => setInfo((v) => !v)}>
            <Info size={13} aria-hidden="true" />
          </button>
        )}
        {!collapsed && (
          <button type="button" className="icon-btn" aria-label="Open full view" onClick={() => openView?.(meta.view)}>
            <ArrowUpRight size={13} aria-hidden="true" />
          </button>
        )}
        <CardMenu type={type} />
      </div>
      {!collapsed && (
        <>
          {info ? <p className="wc-read">{HOW[type][mode]}</p> : children}
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

function MatchCard() {
  const meta = useMeta();
  const { current } = useCurrent();
  const flex = meta.programs.find((p) => p.program === 'FLEX');
  const tol = fmtTolerance(meta.tolerance);
  if (!current) return null;
  const reading =
    current.n_exact > 0 ? `${current.n_exact} FLEX tests match within ${tol}.`
    : current.n_near > 0 ? `No FLEX test sits exactly at ${fmtCriterionO2(current)} and ${fmtCriterionP(current)}; ${current.n_near} are within ${tol}.`
    : `No FLEX test matches this atmosphere, even within ${tol}.`;
  return (
    <Frame type="scenario_match" icon={<Flame size={13} />} src={<>FLEX · {flex?.psi_id ?? 'PSI-69'} · <Doi doi={current.source_doi} /></>} n={`n = ${current.n_near || current.n_exact}`}>
      <div className="ring-row">
        <MatchRingSvg exact={current.n_exact} near={current.n_near} total={flex?.n ?? 274} minN={meta.min_n} />
        <div>
          <div className="wc-big num">{current.n_near} <small>{current.n_exact > 0 ? 'within tolerance' : 'near'}</small></div>
          <div className="dim num" style={{ fontSize: 'var(--fs-sm)' }}>{current.n_exact} exact {current.n_exact === 1 ? 'match' : 'matches'}</div>
        </div>
      </div>
      <p className="wc-read">{reading}</p>
    </Frame>
  );
}

function InspectorCard() {
  const { showTests } = useUi();
  const { current, idx, scenarios } = useCurrent();
  if (!current) return null;
  const ids = current.n_near > 0 ? current.near.test_ids : current.nearest?.test_ids;
  const count = current.n_near > 0 ? current.n_near : current.nearest?.n ?? 0;
  const label = `${SHORT_NAME[current.id]}: ${current.n_exact > 0 ? 'matching' : 'near-match'} tests`;
  return (
    <Frame type="scenario_inspector" icon={<Target size={13} />} src={<>scenarios.json</>} n={`${String(idx + 1).padStart(2, '0')} of ${String(scenarios.length).padStart(2, '0')}`}
      extra={!current.verified ? <span className="badge badge-caution">Unverified</span> : null}>
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
        <div><span>Earth, for comparison</span><b>21% · 14.7 psi</b></div>
        <div><span>Exact · within tolerance</span><b className={current.n_near === 0 ? 'warn-text' : undefined}>{current.n_exact} · {current.n_near} tests</b></div>
      </div>
      {ids && count > 0 ? (
        <button type="button" className="cta-mint" onClick={() => showTests({ ids, label: current.n_near > 0 ? label : `Closest tested condition to ${SHORT_NAME[current.id]} (not this scenario)` })}>
          Show {count} {current.n_exact === 0 ? 'closest ' : ''}tests{current.n_near === 0 ? ' (not this scenario)' : ''}
        </button>
      ) : (
        <p className="wc-read">No FLEX test is near this atmosphere. No data.</p>
      )}
    </Frame>
  );
}

function OutcomesCard() {
  const meta = useMeta();
  const { current } = useCurrent();
  if (!current) return null;
  const out = current.n_near > 0 ? current.near.n_by_outcome : current.nearest?.n_by_outcome;
  const total = current.n_near || current.nearest?.n || 0;
  return (
    <Frame type="outcomes" icon={<Layers size={13} />} src={<>FLEX · PSI-69</>} n={`n = ${total}`}>
      {total > 0 ? <OutcomeBarsSvg outcomes={out} total={total} minN={meta.min_n} /> : <p className="nodata">No data for this atmosphere.</p>}
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
        <span className="mono">~1.0 atm</span>
      </div>
      <BurningRateChartSvg cells={coverage.cells} bands={meta.o2_bands} pressureLevel="~1.0 atm" metric="rate" mode={view} minN={meta.min_n} compact />
      <p className="wc-read">{mode === 'engineer' ? 'Mean K (mm²/s) at ~1.0 atm. Descriptive; suppressants mixed.' : 'At ~1.0 atm, both fuels burn faster as oxygen increases. Descriptive; suppressants mixed.'}</p>
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
    <Frame type="coverage" icon={<Target size={13} />} src={<>FLEX · PSI-69</>} n={`${tested} of ${cells.length} tested`}
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

function GapsCard() {
  const { gaps } = useGaps();
  return (
    <Frame type="gaps" icon={<span>∅</span>} src={<>PSI-69 · PSI-25</>} n={`${gaps.length} gaps`}>
      <ul className="glist">
        <li>{MICROGRAVITY_NOTE}</li>
        {gaps.slice(0, 2).map((g) => <li key={g.id}>{g.text}</li>)}
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

export function BoardCard({ type }: { type: CardType }) {
  switch (type) {
    case 'scenario_match': return <MatchCard />;
    case 'scenario_inspector': return <InspectorCard />;
    case 'outcomes': return <OutcomesCard />;
    case 'burning_rate': return <BurningRateCard />;
    case 'coverage': return <CoverageCard />;
    case 'materials': return <MaterialsCard />;
    case 'gaps': return <GapsCard />;
    case 'kpi': return <KpiCard />;
  }
}
