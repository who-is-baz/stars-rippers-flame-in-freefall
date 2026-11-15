// The single-screen console: full-bleed scene + two card rails + atmosphere dock. Nothing scrolls here.
// Everything else (table, coverage map, fuels, materials, scenarios, gaps, sources) opens as a full view
// over the scene, so the whole project is reachable from one screen.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Compass, Eye, EyeOff, HelpCircle, Plus, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import type { Scenario } from '../data/types';
import { useCoverage, useExperiments, useMaterials, useMeta, useScenarios } from '../data/useData';
import { useUi, type TablePreset } from '../state/ui';
import { MAX_PER_SIDE, useBoard, type ViewId } from '../state/board';
import { FlameScene, type ObservedFlame } from '../components/FlameScene';
import { AtmosphereExplorer, fmtCrit, useAtmosphere } from './AtmosphereExplorer';
import { CustomContext, type CustomState } from '../state/custom';
import { IndicatorsStrip } from './IndicatorsStrip';
import { BoardCard, MiniFlameThumb, SHORT_NAME } from '../components/Cards';
import { KpiRingSvg } from '../components/charts';
import { Gallery } from '../components/Gallery';
import { fmtTolerance, fmtCriterionO2 } from '../lib/scenario';
import { fmtDiameter, fmtGas, fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { outcomeLabel } from '../lib/honesty';
import { EMPTY_FILTERS, filterRows } from '../lib/table';
import { Doi, QcChips, Skeleton } from '../components/ui';

// Full views are only needed when opened: they load on demand, keeping the first screen light.
const ExperimentTable = lazy(() => import('./ExperimentTable').then((m) => ({ default: m.ExperimentTable })));
const CoverageMap = lazy(() => import('./CoverageMap').then((m) => ({ default: m.CoverageMap })));
const FuelComparison = lazy(() => import('./FuelComparison').then((m) => ({ default: m.FuelComparison })));
const Materials = lazy(() => import('./Materials').then((m) => ({ default: m.Materials })));
const ScenarioExplorer = lazy(() => import('./ScenarioExplorer').then((m) => ({ default: m.ScenarioExplorer })));
const DataCharts = lazy(() => import('./DataCharts').then((m) => ({ default: m.DataCharts })));
const Gaps = lazy(() => import('./Gaps').then((m) => ({ default: m.Gaps })));
const Sources = lazy(() => import('./Sources').then((m) => ({ default: m.Sources })));

export const VIEW_TITLE: Record<ViewId, string> = {
  overview: 'Overview', explore: 'Experiment table', coverage: 'Coverage map', charts: 'Data charts', gaps: 'Gaps & limitations',
  scenarios: 'Scenario explorer', fuels: 'Fuel comparison', materials: 'Materials', sources: 'Sources & credits',
};

const SUB_VIEWS: { id: ViewId; label: string }[] = [
  { id: 'explore', label: 'Experiments' },
  { id: 'charts', label: 'Charts' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'fuels', label: 'Fuels' },
  { id: 'materials', label: 'Materials' },
  { id: 'gaps', label: 'Gaps' },
  { id: 'sources', label: 'Sources' },
];

const INTRO_KEY = 'fif.intro.v2';
const readIntro = () => { try { return window.localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } };

function ViewPanel({ view, preset, onSelectView, onClose }: { view: ViewId; preset: TablePreset | null; onSelectView: (v: ViewId) => void; onClose: () => void }) {
  // Closing plays a short exit animation first, then asks the parent to unmount the panel.
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const close = () => {
    if (leaving) return;
    setLeaving(true);
    timer.current = window.setTimeout(onClose, 170);
  };
  return (
    <section className={`glass view-panel${leaving ? ' leaving' : ''}`} role="dialog" aria-modal="false" aria-label={VIEW_TITLE[view]}>
      <header className="view-bar">
        <button type="button" className="btn btn-sm" onClick={close}>← Back to console</button>
        <div className="seg seg-compact" role="group" aria-label="Full view sections">
          {SUB_VIEWS.map((sv) => (
            <button key={sv.id} type="button" aria-pressed={view === sv.id} onClick={() => onSelectView(sv.id)}>
              {sv.label}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" aria-label="Close view" onClick={close}><X size={14} aria-hidden="true" /></button>
      </header>
      <div className="view-body" key={view}>
        <Suspense fallback={<div className="stack" style={{ padding: 24 }} role="status" aria-label="Loading view"><Skeleton h={22} w="260px" /><Skeleton h={220} /></div>}>
        {view === 'explore' && <ExperimentTable preset={preset} />}
        {view === 'coverage' && <CoverageMap />}
        {view === 'fuels' && <FuelComparison />}
        {view === 'materials' && <Materials />}
        {view === 'scenarios' && <ScenarioExplorer />}
        {view === 'charts' && <DataCharts />}
        {view === 'gaps' && <Gaps />}
        {view === 'sources' && <Sources />}
        </Suspense>
      </div>
    </section>
  );
}

function CompactExplorer({
  preset,
  scenario,
  onFullTable,
  onClose,
}: {
  preset: TablePreset | null;
  scenario: Scenario;
  onFullTable: () => void;
  onClose: () => void;
}) {
  const { items } = useExperiments();
  const meta = useMeta();
  const panelRef = useRef<HTMLElement>(null);
  const [scope, setScope] = useState<'scenario' | 'preset' | 'all' | 'FLEX' | 'BASS-II'>(() => (preset ? 'preset' : 'scenario'));
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(18);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (preset) {
      setScope('preset');
      setLimit(18);
      setSelectedId(null);
      try {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch { /* test env */ }
    }
  }, [preset?.token]);

  // When the user picks a different atmosphere in the bottom dock, update the explorer to that atmosphere
  const prevScenarioId = useRef(scenario.id);
  useEffect(() => {
    if (prevScenarioId.current !== scenario.id) {
      prevScenarioId.current = scenario.id;
      setScope('scenario');
      setSelectedId(null);
    }
  }, [scenario.id]);

  const scenarioIds = useMemo(() => {
    const list = scenario.n_near > 0 ? scenario.near.test_ids : scenario.nearest?.test_ids ?? [];
    return new Set(list);
  }, [scenario]);

  const filtered = useMemo(() => {
    let base = items;
    if (scope === 'scenario') {
      base = items.filter((r) => scenarioIds.has(r.test_id));
    } else if (scope === 'preset' && preset) {
      base = filterRows(
        items,
        {
          ...EMPTY_FILTERS,
          ids: preset.ids ?? null,
          program: preset.program ?? '',
          kind: preset.fuel ?? '',
          o2Band: preset.o2Band ?? '',
          pressure: preset.pressure ?? '',
        },
        meta,
      );
    } else if (scope === 'FLEX') {
      base = items.filter((r) => r.program === 'FLEX');
    } else if (scope === 'BASS-II') {
      base = items.filter((r) => r.program === 'BASS-II');
    }

    const query = q.trim().toLowerCase();
    if (!query) return base;
    return base.filter((r) => {
      const hay = `${r.test_id} ${r.material_or_fuel} ${r.material_category ?? ''} ${r.program} ${r.outcome ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [items, scope, scenarioIds, preset, meta, q]);

  const shown = filtered.slice(0, limit);
  const scenarioCount = scenarioIds.size;
  const activeRow = useMemo(
    () => (selectedId ? filtered.find((r) => r.test_id === selectedId) ?? null : null),
    [filtered, selectedId],
  );

  const activeTitle =
    scope === 'preset' && preset?.label
      ? preset.label
      : scope === 'scenario'
        ? `${SHORT_NAME[scenario.id]} · ${scenario.n_near > 0 ? 'near-match tests' : 'closest tested condition (not this scenario)'}`
        : `${scope === 'all' ? 'All PSI' : scope} tests`;

  return (
    <section ref={panelRef} className="glass dock-explorer" aria-label="Quick test explorer">
      <header className="dock-exp-bar">
        <div className="row" style={{ gap: 6 }}>
          <strong style={{ fontSize: 'var(--fs-sm)', color: 'var(--mint)' }}>{activeTitle}</strong>
          <span className="src-pill num">{filtered.length} tests</span>
          <div className="mini-seg" role="group" aria-label="Filter test scope">
            {preset && (
              <button type="button" aria-pressed={scope === 'preset'} onClick={() => setScope('preset')}>
                Consulted
              </button>
            )}
            <button type="button" aria-pressed={scope === 'scenario'} onClick={() => setScope('scenario')}>
              {SHORT_NAME[scenario.id]} ({scenarioCount})
            </button>
            <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
              All ({items.length})
            </button>
            <button type="button" aria-pressed={scope === 'FLEX'} onClick={() => setScope('FLEX')}>
              FLEX
            </button>
            <button type="button" aria-pressed={scope === 'BASS-II'} onClick={() => setScope('BASS-II')}>
              BASS-II
            </button>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <label className="dock-exp-search">
            <Search size={12} aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ID, fuel or material…"
              aria-label="Filter tests by ID, fuel or material"
            />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onFullTable} title="Open full table with CSV export">
            Full table <ArrowUpRight size={12} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" aria-label="Close test explorer" onClick={onClose}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {activeRow && (
        <div className="exp-row-detail num" role="region" aria-label={`Details for test ${activeRow.test_id}`}>
          <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div className="row" style={{ gap: 10 }}>
              <strong className="mono" style={{ color: 'var(--mint)' }}>{activeRow.test_id}</strong>
              <span className="src-pill">{activeRow.program} · {activeRow.date || 'Date n/r'}</span>
              <span>Fuel/Material: <b>{activeRow.material_or_fuel}</b> ({activeRow.material_category})</span>
              <span>O₂: <b>{fmtO2(activeRow.o2_fraction)}</b></span>
              <span>Pressure: <b>{fmtPressure(activeRow.pressure_atm)}</b></span>
              {activeRow.program === 'FLEX' && (
                <span>Suppressant: <b>{fmtGas(activeRow.co2_fraction, 'CO₂')} · {fmtGas(activeRow.he_fraction, 'He')}</b></span>
              )}
              <span>Outcome: <b>{outcomeLabel(activeRow.outcome)}</b> ({activeRow.outcome_source})</span>
              {activeRow.burning_rate_mm2_s != null && <span>Burning rate: <b>{fmtRate(activeRow.burning_rate_mm2_s)}</b></span>}
              {activeRow.outcome === 'extinction' && activeRow.extinction_diameter_mm != null && (
                <span>Ext. diameter: <b>{fmtDiameter(activeRow.extinction_diameter_mm)}</b></span>
              )}
              <Doi doi={activeRow.source_doi} />
            </div>
            <button type="button" className="icon-btn" aria-label="Close test detail" onClick={() => setSelectedId(null)}>
              <X size={12} aria-hidden="true" />
            </button>
          </div>
          {activeRow.qc_flags.length > 0 && (
            <div className="row" style={{ marginTop: 4 }}>
              <span className="dim">QC flags:</span>
              <QcChips flags={activeRow.qc_flags} />
            </div>
          )}
        </div>
      )}

      <div className="mini-test-grid">
        {shown.map((r, idx) => {
          const isSel = selectedId === r.test_id;
          return (
            <button
              type="button"
              key={`${r.test_id}-${idx}`}
              className={`mini-test-card${isSel ? ' on' : ''}`}
              aria-pressed={isSel}
              onClick={() => setSelectedId((prev) => (prev === r.test_id ? null : r.test_id))}
            >
              <div className="mt-top">
                <strong className="mono">{r.test_id}</strong>
                <span className={`out-pill ${r.outcome ? `o-${r.outcome}` : ''}`}>
                  {r.outcome ? outcomeLabel(r.outcome) : 'not stated'}
                </span>
              </div>
              <div className="mt-mid">
                <span>
                  <i
                    className="mt-dot"
                    style={{
                      background:
                        r.material_or_fuel === 'heptane'
                          ? 'var(--fuel-heptane)'
                          : r.material_or_fuel === 'methanol'
                            ? 'var(--fuel-methanol)'
                            : 'var(--prog-bass2)',
                    }}
                  />
                  {r.material_category ?? r.material_or_fuel}
                </span>
                <small className="dim">{r.program}</small>
              </div>
              <div className="mt-bot num">
                <span>{fmtO2(r.o2_fraction)}</span>
                <span>{r.pressure_atm != null ? fmtPressure(r.pressure_atm) : 'Pressure n/r'}</span>
                {r.burning_rate_mm2_s != null && <span>{fmtRate(r.burning_rate_mm2_s)}</span>}
              </div>
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="dim" style={{ gridColumn: '1 / -1', padding: '12px 4px' }}>
            No tests match this filter. Try switching to &ldquo;All ({items.length})&rdquo;.
          </p>
        )}
      </div>
      {filtered.length > shown.length && (
        <div className="dock-exp-foot">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setLimit((l) => l + 24)}>
            Show more ({filtered.length - shown.length} remaining)
          </button>
        </div>
      )}
    </section>
  );
}

export function Console({ preset, assistantOpen = false }: { preset: TablePreset | null; assistantOpen?: boolean }) {
  const meta = useMeta();
  const coverage = useCoverage();
  const materialsData = useMaterials();
  const { scenarios } = useScenarios();
  const { board, notice, dismissNotice, undo, canUndo } = useBoard();
  const { openAssistant, prefillAssistant, showTests, scenarioId, setScenarioId, mode = 'explorer', customizeOpen = false, setCustomizeOpen, view, openView, closeView } = useUi();
  const { items: allRows } = useExperiments();
  const atm = useAtmosphere(allRows, meta);
  const [customOn, setCustomOn] = useState(false); // "Custom" tab next to the presets: observed-data explorer
  const observed = useMemo<ObservedFlame | undefined>(() => {
    if (!customOn) return undefined;
    const m = atm.result;
    const caption = m.n === 0
      ? 'No test within tolerance of these settings'
      : `${m.byOutcome.extinction} of ${m.n} tests ended in extinction${m.meanRate != null ? ` · Observed mean burning rate ${m.meanRate.toFixed(2)} mm²/s (n = ${m.nRate})` : ''}${atm.state === 'small_n' ? ' · n < 5' : atm.state === 'mixed' ? ' · mixed outcomes' : ''}`;
    return { state: atm.state, glow: atm.glow, k: m.byOutcome.extinction, n: m.n, atmosphere: fmtCrit(atm.filters.o2, atm.filters.pressure_psi), caption, o2: atm.filters.o2.value, psi: atm.filters.pressure_psi.value };
  }, [customOn, atm.result, atm.state, atm.glow, atm.filters.o2, atm.filters.pressure_psi]);
  const customState = useMemo<CustomState>(() => {
    if (!customOn) return { active: false, summary: null };
    const f = atm.filters, m = atm.result;
    return {
      active: true,
      summary: {
        atmosphere: fmtCrit(f.o2, f.pressure_psi),
        fuel: f.fuel === 'any' ? 'heptane and methanol' : f.fuel,
        suppressant: f.suppressant === 'any' ? 'any suppressant' : f.suppressant === 'none' ? 'no suppressant' : `${f.suppressant === 'co2' ? 'CO₂' : 'He'} added`,
        n: m.n, n_exact: m.n_exact, ids: [...new Set(m.tests.map((r) => r.test_id))],
        o2: f.o2, pressure_psi: f.pressure_psi, fuelRaw: f.fuel, suppressantRaw: f.suppressant,
      },
    };
  }, [customOn, atm.filters, atm.result]);
  const [introOpen, setIntroOpen] = useState(readIntro);
  const [tour, setTour] = useState<number | null>(null);
  const [focus, setFocus] = useState(false); // hides the cards so the scene fills the screen
  const [dockTab, setDockTab] = useState<'scenarios' | 'explore' | 'investigations'>('scenarios');

  // Whenever "Show 17 closest tests" or a radar sector is clicked, open the compact in-dashboard explorer!
  useEffect(() => {
    if (preset) setDockTab('explore');
  }, [preset?.token]);

  const bassProg = meta.programs.find((p) => p.program === 'BASS-II');
  const bassWithOutcome = materialsData.materials.reduce((acc, m) => acc + m.n_with_outcome, 0);
  const testedCells = coverage.n_cells - coverage.n_cells_empty;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== 'f' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      setFocus((f) => !f);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeId = scenarioId ?? 'lunar_challenge';
  const current = scenarios.find((s) => s.id === activeId) ?? scenarios[0];
  const tol = fmtTolerance(meta.tolerance);
  const setIntro = (open: boolean) => {
    setIntroOpen(open);
    try { window.localStorage.setItem(INTRO_KEY, open ? '1' : '0'); } catch { /* ignore */ }
  };

  // Notices fade out by themselves; the next one replaces the current one.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(dismissNotice, 5000);
    return () => window.clearTimeout(t);
  }, [notice, dismissNotice]);

  const leftFree = board.left.length < MAX_PER_SIDE.left;
  const rightFree = board.right.length < MAX_PER_SIDE.right;

  return (
    <CustomContext.Provider value={customState}>
    <IndicatorsStrip />
    <header className="console-section" id="top">
      <div className={`console-frame${focus ? ' is-focus' : ''}${customizeOpen ? ' is-editing' : ''}${assistantOpen ? ' is-assistant-open' : ''}${view && view !== 'overview' ? ' is-busy' : ''}${dockTab === 'explore' ? ' is-exploring' : ''}${customOn && dockTab === 'scenarios' ? ' is-custom' : ''}`}>
        {current && <FlameScene scenario={current} mode={mode} observed={observed} />}
        {customizeOpen && <div className="grid-overlay" aria-hidden="true" />}

        <button type="button" className="glass focus-btn" aria-pressed={focus} aria-keyshortcuts="F" onClick={() => setFocus((f) => !f)}
          title={focus ? 'Show the cards (F)' : 'Hide the cards (F)'}>
          {focus ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {focus ? 'Show cards' : 'Focus'}
        </button>

        <span className="console-credit">Uses NASA PSI open data ({meta.license}). Not endorsed by NASA.</span>

        {notice && (
          <div className="glass console-toast" role="status" aria-live="polite">
            <span>{notice.text}</span>
            {notice.undoable && canUndo && (
              <button type="button" className="toast-undo" onClick={undo}><RotateCcw size={12} aria-hidden="true" /> Undo</button>
            )}
          </div>
        )}

        {/* ---- left rail ---- */}
        <aside className="console-left" aria-label="Key questions">
          <div className="rail-header">
            <span className="rail-eyebrow">
              <Sparkles size={13} color="var(--mint)" aria-hidden="true" /> SI insights
            </span>
            <div className="row" style={{ gap: 5 }}>
              <button type="button" className="rail-help" onClick={() => setCustomizeOpen?.(!customizeOpen)} aria-pressed={customizeOpen}>
                <Plus size={12} aria-hidden="true" /> Cards
              </button>
              <button type="button" className="rail-help" onClick={() => setTour(1)}>
                <Compass size={12} aria-hidden="true" /> Tour
              </button>
              <button type="button" className="rail-help" aria-expanded={introOpen} onClick={() => setIntro(!introOpen)} aria-label="About this dashboard">
                <HelpCircle size={12} aria-hidden="true" /> About
              </button>
            </div>
          </div>
          {introOpen && (
            <div className="glass wc intro-block">
              <h1>Fire behaves differently in space.</h1>
              <p>Explore <strong className="num">{meta.n_tests}</strong> NASA fire tests run on the ISS and see what they say about spacecraft and Moon-base air.</p>
              <div className="row" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTour(1)}><Compass size={13} aria-hidden="true" /> 30-s tour</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIntro(false)}>Got it</button>
              </div>
            </div>
          )}
          {board.left.map((t, i) => <div className="rail-item" style={{ '--i': i } as CSSProperties} key={t}><BoardCard type={t} /></div>)}
          {leftFree && (
            <button type="button" className="slot-btn slot-btn-sm" onClick={() => setCustomizeOpen?.(true)}>
              + Add card ({MAX_PER_SIDE.left - board.left.length} free)
            </button>
          )}
        </aside>

        {/* ---- right rail (the gallery takes its place while customizing) ---- */}
        {!customizeOpen && (
          <aside className="console-right" aria-label="Scenario inspector and coverage">
            {board.right.map((t, i) => <div className="rail-item" style={{ '--i': i } as CSSProperties} key={t}><BoardCard type={t} /></div>)}
            {rightFree && (
              <button type="button" className="slot-btn slot-btn-sm" onClick={() => setCustomizeOpen?.(true)}>
                + Add card ({MAX_PER_SIDE.right - board.right.length} free)
              </button>
            )}
          </aside>
        )}
        {customizeOpen && <Gallery onClose={() => setCustomizeOpen?.(false)} />}

        {/* ---- tour (the only light element) ---- */}
        {tour != null && !view && (
          <div className="tour-card" role="dialog" aria-label="30-second guided tour">
            {tour === 1 && <><b>1 · Pick an atmosphere</b><p>Each button below is the air a crew could breathe. The flame and the cards update.</p></>}
            {tour === 2 && <><b>2 · Check exact vs. near matches</b><p>Moon base air has 0 exact FLEX matches, but {scenarios.find((s) => s.id === 'lunar_challenge')?.n_near ?? 0} tests within {tol}. Every card shows its n and source.</p></>}
            {tour === 3 && <><b>3 · Make it yours</b><p>Use Customize to add, move or remove cards, the top tabs to open the full data, press F to hide the cards, or ask the SI assistant.</p></>}
            <div className="tour-foot">
              <button type="button" className="tour-skip" onClick={() => setTour(null)}>{tour} of 3 · Skip</button>
              <button type="button" className="tour-next" onClick={() => setTour(tour < 3 ? tour + 1 : null)}>{tour < 3 ? 'Next' : 'Finish'}</button>
            </div>
          </div>
        )}

        {/* ---- In-dashboard Compact Test Explorer (replaces separate Explore page tab) ---- */}
        {dockTab === 'explore' && current && !view && (
          <CompactExplorer
            preset={preset}
            scenario={current}
            onFullTable={() => openView?.('explore')}
            onClose={() => setDockTab('scenarios')}
          />
        )}

        {/* ---- Custom atmosphere explorer (observed FLEX tests only) ---- */}
        {customOn && dockTab === 'scenarios' && (!view || view === 'overview') && (
          <AtmosphereExplorer
            atm={atm}
            scenarios={scenarios}
            meta={meta}
            onShowTests={(ids, label) => showTests({ ids, label })}
            onAsk={(q) => (prefillAssistant ? prefillAssistant(q) : openAssistant())}
            onClose={() => setCustomOn(false)}
          />
        )}

        {/* ---- Mission Dashboard Bottom Dock (Scenarios · Explore · Investigations + KPI Rings) ---- */}
        <div className="console-dock" role="region" aria-label="Atmosphere scenarios, test explorer and dataset coverage">
          <div className="dock-tabs" role="tablist" aria-label="Bottom dock mode">
            <button
              type="button"
              role="tab"
              aria-selected={dockTab === 'scenarios'}
              className={dockTab === 'scenarios' ? 'on' : ''}
              onClick={() => setDockTab('scenarios')}
            >
              Scenarios
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dockTab === 'explore'}
              className={dockTab === 'explore' ? 'on' : ''}
              onClick={() => setDockTab((t) => (t === 'explore' ? 'scenarios' : 'explore'))}
            >
              Explore tests
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dockTab === 'investigations'}
              className={dockTab === 'investigations' ? 'on' : ''}
              onClick={() => setDockTab('investigations')}
            >
              Investigations
            </button>
          </div>

          {dockTab !== 'investigations' ? (
            <div className="glass dock-cards" role="group" aria-label="Choose an atmosphere">
              {scenarios.map((s) => {
                const active = s.id === activeId;
                const hasMatches = s.n_exact > 0 || s.n_near > 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`dock-card${active ? ' on' : ''}`}
                    aria-pressed={active}
                    title={`${fmtCriterionO2(s)} · ${s.n_exact} exact · ${s.n_near} near`}
                    onClick={() => { setScenarioId?.(s.id as Scenario['id']); if (customOn) atm.applyPreset(s); }}
                  >
                    <MiniFlameThumb o2={s.criteria.o2.value} />
                    <div className="dock-card-body">
                      <h4>{SHORT_NAME[s.id] ?? s.label}</h4>
                      <span className={`dock-chip${hasMatches ? ' ok' : ' none'}`}>
                        <i aria-hidden="true" />
                        {hasMatches ? 'Tests nearby' : 'No matching tests'}
                      </span>
                      <div className="dock-meta num">
                        <span>{fmtCriterionO2(s)}</span>
                        <b>
                          {s.n_exact}/{s.n_near}
                        </b>
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                className={`dock-card ax-dock-card${customOn ? ' on' : ''}`}
                aria-pressed={customOn}
                title="Pick your own fuel, O₂, pressure and suppressant: shows the FLEX tests observed near those settings"
                onClick={() => { setCustomOn((c) => !c); setDockTab('scenarios'); }}
              >
                <div className="dock-card-body">
                  <h4>Custom</h4>
                  <span className="dock-chip ok"><i aria-hidden="true" />Observed tests</span>
                  <div className="dock-meta num"><span>sliders</span><b>{customOn ? atm.result.n : '—'}</b></div>
                </div>
              </button>
            </div>
          ) : (
            <div className="glass dock-cards dock-stats" role="group" aria-label="Investigations summary">
              {meta.programs.map((p) => (
                <div key={p.program} className="dock-stat-item">
                  <div className="stat-n num">{p.n}</div>
                  <div className="stat-l">
                    {p.program} · {p.what} ({p.psi_id})
                  </div>
                  <div className="stat-src">DOI: {p.source_doi}</div>
                </div>
              ))}
            </div>
          )}

          <div className="glass dock-kpis">
            <KpiRingSvg
              num={bassWithOutcome}
              den={bassProg?.n ?? 129}
              label="BASS-II outcomes stated"
            />
            <KpiRingSvg
              num={testedCells}
              den={coverage.n_cells}
              label="FLEX conditions tested"
            />
            {!assistantOpen && (
              <button type="button" className="btn btn-sm sitab-inline" onClick={() => openAssistant()} aria-label="Open SI assistant">
                <Sparkles size={13} color="var(--mint)" aria-hidden="true" />
                <span>SI</span>
              </button>
            )}
          </div>
        </div>

        {view && view !== 'overview' && <ViewPanel view={view} preset={preset} onSelectView={(v) => openView?.(v)} onClose={() => closeView?.()} />}
      </div>
    </header>
    </CustomContext.Provider>
  );
}
