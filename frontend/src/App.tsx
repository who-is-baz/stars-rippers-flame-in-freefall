import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Pause, Play, RotateCcw, Search, Sparkles } from 'lucide-react';
import { setDisplayPrefs, useDisplayPrefs, type TextSize } from './lib/displayPrefs';
import { DataProvider, RetryContext } from './data/DataProvider';
import { useDataState } from './data/useData';
import type { Scenario } from './data/types';
import { UiContext, type BoardCardType, type ExplanationMode, type TablePreset, type TableRequest, type UiActions } from './state/ui';
import { BoardContext, useBoard, useBoardState, type CardType, type ViewId } from './state/board';
import { ErrorState, Skeleton } from './components/ui';
import { Console } from './sections/Console';
import { Sidebar } from './assistant/Sidebar';

const MAIN_TABS: { view: ViewId; label: string }[] = [
  { view: 'overview', label: 'Dashboard' },
  { view: 'explore', label: 'Experiments' },
  { view: 'coverage', label: 'Coverage' },
  { view: 'gaps', label: 'Gaps' },
];
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

// What the SI assistant asks for -> the card type on the board.
const SI_CARD: Record<BoardCardType, CardType | 'table' | 'materials_view'> = {
  burning_rate_line: 'burning_rate',
  outcomes_bars: 'outcomes',
  coverage_heatmap: 'coverage',
  materials_bars: 'materials',
  tests_scatter: 'table',
  investigations_pillars: 'investigations',
};

const SCENARIOS: readonly Scenario['id'][] = ['earth_iss', 'lunar_challenge', 'lunar_nasa', 'exploration', 'suit'];
const MODES: readonly ExplanationMode[] = ['explorer', 'engineer'];
// Read a saved choice, accepting only values we know (storage can hold anything).
function remembered<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return allowed.find((a) => a === v) ?? fallback;
  } catch { return fallback; }
}

// App name (from the team's logo). The challenge is still "Flame in Freefall"; that is the reference, not the product name.
export const APP_NAME = 'Flarefall';
const LOGO_1X = './brand/logo-name@1x.png';
const LOGO_2X = './brand/logo-name@2x.png';

function Nav({ onAssistant, open, mode, onMode, customizeOpen, onCustomize, view, onView }: {
  onAssistant: () => void; open: boolean; mode: ExplanationMode; onMode: (m: ExplanationMode) => void;
  customizeOpen: boolean; onCustomize: (v: boolean) => void; view: ViewId; onView: (v: ViewId) => void;
}) {
  const { undo, canUndo } = useBoard();
  const isExploreGroup = view === 'explore' || view === 'charts' || view === 'scenarios' || view === 'fuels' || view === 'materials' || view === 'sources';

  return (
    <nav className="nav" aria-label="Views">
      <div className="nav-in">
        <button type="button" className="brand" onClick={() => onView('overview')} aria-label={`${APP_NAME}: go to the dashboard`}>
          <img className="brand-logo" src={LOGO_1X} srcSet={`${LOGO_1X} 1x, ${LOGO_2X} 2x`} alt={APP_NAME} width={103} height={32} />
        </button>
        <ul className="nav-links" role="list">
          {MAIN_TABS.map((t) => {
            const active = t.view === 'explore' ? isExploreGroup : view === t.view;
            return (
              <li key={t.view}>
                <button type="button" className={active ? 'nav-pill-active' : undefined} aria-current={active ? 'page' : undefined} onClick={() => onView(t.view)}>{t.label}</button>
              </li>
            );
          })}
        </ul>

        <div className="nav-right">
          <DisplayControls />
          {!customizeOpen ? (
            <>
              <button type="button" className="ask-trigger" aria-label="Ask the SI assistant" onClick={onAssistant} aria-expanded={open} aria-controls="assistant" aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
                <Sparkles size={14} color="var(--mint)" aria-hidden="true" />
                <span>Ask the SI assistant…</span>
                <span className="kbd" aria-hidden="true">{SHORTCUT}</span>
                <Search size={14} color="var(--silver)" aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-sm" onClick={() => onCustomize(true)} aria-pressed={customizeOpen}>
                <LayoutGrid size={13} aria-hidden="true" /> Customize
              </button>
              <div className="seg seg-compact" role="group" aria-label="Explanation mode">
                <button type="button" aria-pressed={mode === 'explorer'} onClick={() => onMode('explorer')}>Explorer</button>
                <button type="button" aria-pressed={mode === 'engineer'} onClick={() => onMode('engineer')}>Engineer</button>
              </div>
            </>
          ) : (
            <div className="row">
              <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>Editing board · saved automatically</span>
              <button type="button" className="btn btn-sm btn-ghost" disabled={!canUndo} onClick={undo}><RotateCcw size={13} aria-hidden="true" /> Undo</button>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => onCustomize(false)}>Done</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const TEXT_SIZES: { v: TextSize; label: string; name: string }[] = [
  { v: 'sm', label: 'A−', name: 'Smaller text' }, { v: 'md', label: 'A', name: 'Default text size' }, { v: 'lg', label: 'A+', name: 'Larger text' },
];

// Text size (scales the whole interface; remembered) and "Pause animations" (flame, stars, particles; remembered).
function DisplayControls() {
  const { text, paused } = useDisplayPrefs();
  return (
    <div className="display-ctl">
      <div className="seg seg-compact" role="group" aria-label="Text size">
        {TEXT_SIZES.map((t) => (
          <button key={t.v} type="button" aria-pressed={text === t.v} aria-label={t.name} title={t.name} onClick={() => setDisplayPrefs({ text: t.v })}>{t.label}</button>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-ghost" aria-pressed={paused} onClick={() => setDisplayPrefs({ paused: !paused })}
        title={paused ? 'Resume animations' : 'Pause animations'}>
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        <span className="display-ctl-label">Pause animations</span>
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="section" role="status" aria-label="Loading data">
      <div className="stack" style={{ paddingTop: 48 }}>
        <Skeleton h={18} w="220px" />
        <Skeleton h={72} w="min(560px, 90%)" />
        <Skeleton h={22} w="min(640px, 100%)" />
        <Skeleton h={280} />
      </div>
    </div>
  );
}

function Page() {
  const state = useDataState();
  const retry = useContext(RetryContext);
  const boardApi = useBoardState();
  const [preset, setPreset] = useState<TablePreset | null>(null);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#assistant');
  const [pending, setPending] = useState<{ token: number; question: string } | null>(null);
  const [draft, setDraft] = useState<{ token: number; question: string } | null>(null);
  const [scenarioId, setScenarioId] = useState<Scenario['id']>(() => remembered('fif.scenario', SCENARIOS, 'lunar_challenge'));
  const [mode, setMode] = useState<ExplanationMode>(() => remembered('fif.mode', MODES, 'explorer'));
  useEffect(() => { try { window.localStorage.setItem('fif.scenario', scenarioId); window.localStorage.setItem('fif.mode', mode); } catch { /* private mode */ } }, [scenarioId, mode]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [view, setView] = useState<ViewId>('overview');

  const openView = useCallback((v: ViewId) => { setView(v); setCustomizeOpen(false); }, []);
  const closeView = useCallback(() => setView('overview'), []);

  const showTests = useCallback((req: TableRequest) => {
    setPreset({ ...req, token: Date.now() });
    setView('explore');
    setCustomizeOpen(false);
  }, []);

  const openAssistant = useCallback((question?: string) => {
    setOpen(true);
    if (question) setPending({ token: Date.now(), question });
  }, []);

  const prefillAssistant = useCallback((question: string) => {
    setOpen(true);
    setDraft({ token: Date.now(), question });
  }, []);

  const { add, undo } = boardApi;
  const setExtraCard = useCallback<NonNullable<UiActions['setExtraCard']>>((card) => {
    if (!card) { undo(); return; }
    const target = SI_CARD[card.type];
    if (target === 'table') openView('explore');
    else if (target !== 'materials_view') add(target, card.addedBy);
  }, [add, undo, openView]);

  const actions = useMemo<UiActions>(
    () => ({ showTests, openAssistant, prefillAssistant, scenarioId, setScenarioId, mode, setMode, customizeOpen, setCustomizeOpen, view, openView, closeView, setExtraCard }),
    [showTests, openAssistant, prefillAssistant, scenarioId, mode, customizeOpen, view, openView, closeView, setExtraCard],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape' && !open) { setView('overview'); setCustomizeOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ready = state.status === 'ready';

  return (
    <BoardContext.Provider value={boardApi}>
      <UiContext.Provider value={actions}>
        <div className={`app-shell${open ? ' is-assistant-open' : ''}`}>
          <a className="skip" href="#main">Skip to main content</a>
          <Nav
            onAssistant={() => setOpen((o) => !o)} open={open} mode={mode} onMode={setMode}
            customizeOpen={customizeOpen} onCustomize={setCustomizeOpen} view={view} onView={openView}
          />
          <div className="app-workspace">
            <main id="main" tabIndex={-1} className="app-main">
              {state.status === 'loading' && <Loading />}
              {state.status === 'error' && <div className="section"><ErrorState message={state.message} onRetry={retry} /></div>}
              {ready && <Console preset={preset} assistantOpen={open} />}
            </main>
            {ready && <Sidebar open={open} onClose={() => setOpen(false)} pending={pending} draft={draft} />}
          </div>
        </div>
      </UiContext.Provider>
    </BoardContext.Provider>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Page />
    </DataProvider>
  );
}
