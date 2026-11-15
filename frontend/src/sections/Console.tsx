// The single-screen console: full-bleed scene + two card rails + atmosphere dock. Nothing scrolls here.
// Everything else (table, coverage map, fuels, materials, scenarios, gaps, sources) opens as a full view
// over the scene, so the whole project is reachable from one screen.
import { useEffect, useState } from 'react';
import { Compass, HelpCircle, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import type { Scenario } from '../data/types';
import { useMeta, useScenarios } from '../data/useData';
import { useUi, type TablePreset } from '../state/ui';
import { MAX_PER_SIDE, useBoard, type ViewId } from '../state/board';
import { FlameScene } from '../components/FlameScene';
import { BoardCard, SHORT_NAME } from '../components/Cards';
import { Gallery } from '../components/Gallery';
import { fmtTolerance, fmtCriterionO2 } from '../lib/scenario';
import { ExperimentTable } from './ExperimentTable';
import { CoverageMap } from './CoverageMap';
import { FuelComparison } from './FuelComparison';
import { Materials } from './Materials';
import { ScenarioExplorer } from './ScenarioExplorer';
import { Gaps } from './Gaps';
import { Sources } from './Sources';

export const VIEW_TITLE: Record<ViewId, string> = {
  overview: 'Overview', explore: 'Experiment table', coverage: 'Coverage map', gaps: 'Gaps & limitations',
  scenarios: 'Scenario explorer', fuels: 'Fuel comparison', materials: 'Materials', sources: 'Sources & credits',
};

const INTRO_KEY = 'fif.intro.hidden';
const readIntro = () => { try { return window.localStorage.getItem(INTRO_KEY) !== '1'; } catch { return true; } };

function ViewPanel({ view, preset, onClose }: { view: ViewId; preset: TablePreset | null; onClose: () => void }) {
  return (
    <section className="glass view-panel" role="dialog" aria-modal="false" aria-label={VIEW_TITLE[view]}>
      <header className="view-bar">
        <button type="button" className="btn btn-sm" onClick={onClose}>← Back to console</button>
        <span className="dim" style={{ fontSize: 'var(--fs-sm)' }}>{VIEW_TITLE[view]}</span>
        <button type="button" className="icon-btn" aria-label="Close view" onClick={onClose}><X size={14} aria-hidden="true" /></button>
      </header>
      <div className="view-body">
        {view === 'explore' && <ExperimentTable preset={preset} />}
        {view === 'coverage' && <CoverageMap />}
        {view === 'fuels' && <FuelComparison />}
        {view === 'materials' && <Materials />}
        {view === 'scenarios' && <ScenarioExplorer />}
        {view === 'gaps' && <Gaps />}
        {view === 'sources' && <Sources />}
      </div>
    </section>
  );
}

export function Console({ preset }: { preset: TablePreset | null }) {
  const meta = useMeta();
  const { scenarios } = useScenarios();
  const { board, notice, dismissNotice, undo, canUndo } = useBoard();
  const { openAssistant, scenarioId, setScenarioId, mode = 'explorer', customizeOpen = false, setCustomizeOpen, view, closeView } = useUi();
  const [introOpen, setIntroOpen] = useState(readIntro);
  const [tour, setTour] = useState<number | null>(null);

  const activeId = scenarioId ?? 'lunar_challenge';
  const current = scenarios.find((s) => s.id === activeId) ?? scenarios[0];
  const tol = fmtTolerance(meta.tolerance);
  const setIntro = (open: boolean) => {
    setIntroOpen(open);
    try { window.localStorage.setItem(INTRO_KEY, open ? '0' : '1'); } catch { /* ignore */ }
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
    <header className="console-section" id="top">
      <div className={`console-frame${customizeOpen ? ' is-editing' : ''}`}>
        {current && <FlameScene scenario={current} mode={mode} />}
        {customizeOpen && <div className="grid-overlay" aria-hidden="true" />}

        <span className="console-credit">Uses NASA PSI open data ({meta.license}). Not endorsed by NASA.</span>

        {notice && (
          <div className="glass console-toast" role="status" aria-live="polite">
            <span>{notice.text}</span>
            {notice.undoable && canUndo && (
              <button type="button" className="toast-undo" onClick={undo}><RotateCcw size={12} aria-hidden="true" /> Undo</button>
            )}
          </div>
        )}

        <button type="button" className="glass sitab" onClick={() => openAssistant()} aria-label="Open SI assistant">
          <Sparkles size={15} color="var(--mint)" aria-hidden="true" />
          <span>SI assistant</span>
        </button>

        {/* ---- left rail ---- */}
        <aside className="console-left" aria-label="Key questions">
          {introOpen ? (
            <div className="intro-block">
              <h1>Fire behaves differently in space.</h1>
              <p>Explore <strong className="num">{meta.n_tests}</strong> NASA fire tests run on the ISS and see what they say about spacecraft and Moon-base air.</p>
              <div className="row" style={{ marginTop: 10 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTour(1)}><Compass size={13} aria-hidden="true" /> Take the 30-s tour</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIntro(false)}>Dismiss</button>
              </div>
            </div>
          ) : (
            <button type="button" className="rail-help" onClick={() => setIntro(true)} aria-label="Show introduction">
              <HelpCircle size={13} aria-hidden="true" /> What is this?
            </button>
          )}
          {board.left.map((t) => <BoardCard key={t} type={t} />)}
          {customizeOpen && leftFree && (
            <p className="slot-hint"><Plus size={12} aria-hidden="true" /> {MAX_PER_SIDE.left - board.left.length} free slot(s) on this side</p>
          )}
        </aside>

        {/* ---- right rail (the gallery takes its place while customizing) ---- */}
        {!customizeOpen && (
          <aside className="console-right" aria-label="Scenario inspector and coverage">
            {board.right.map((t) => <BoardCard key={t} type={t} />)}
            {board.right.length === 0 && (
              <button type="button" className="slot-btn" onClick={() => setCustomizeOpen?.(true)}>+ Add a card</button>
            )}
            {board.right.length > 0 && rightFree && (
              <button type="button" className="slot-btn slot-btn-sm" onClick={() => setCustomizeOpen?.(true)}>+ Add a card</button>
            )}
          </aside>
        )}
        {customizeOpen && <Gallery onClose={() => setCustomizeOpen?.(false)} />}

        {/* ---- tour (the only light element) ---- */}
        {tour != null && !view && (
          <div className="tour-card" role="dialog" aria-label="30-second guided tour">
            {tour === 1 && <><b>1 · Pick an atmosphere</b><p>Each button below is the air a crew could breathe. The flame and the cards update.</p></>}
            {tour === 2 && <><b>2 · Check exact vs. near matches</b><p>Moon base air has 0 exact FLEX matches, but {scenarios.find((s) => s.id === 'lunar_challenge')?.n_near ?? 0} tests within {tol}. Every card shows its n and source.</p></>}
            {tour === 3 && <><b>3 · Make it yours</b><p>Use Customize to add, move or remove cards, the top tabs to open the full data, or ask the SI assistant.</p></>}
            <div className="tour-foot">
              <button type="button" className="tour-skip" onClick={() => setTour(null)}>{tour} of 3 · Skip</button>
              <button type="button" className="tour-next" onClick={() => setTour(tour < 3 ? tour + 1 : null)}>{tour < 3 ? 'Next' : 'Finish'}</button>
            </div>
          </div>
        )}

        {/* ---- atmosphere dock ---- */}
        <div className="glass atmo" role="group" aria-label="Choose an atmosphere">
          <span>Choose an atmosphere</span>
          {scenarios.map((s) => {
            const active = s.id === activeId;
            return (
              <button key={s.id} type="button" className={active ? 'on' : ''} aria-pressed={active}
                title={`${fmtCriterionO2(s)} · ${s.n_exact} exact · ${s.n_near} near`}
                onClick={() => setScenarioId?.(s.id as Scenario['id'])}>
                {SHORT_NAME[s.id] ?? s.label}
              </button>
            );
          })}
        </div>

        {view && view !== 'overview' && <ViewPanel view={view} preset={preset} onClose={() => closeView?.()} />}
      </div>
    </header>
  );
}
