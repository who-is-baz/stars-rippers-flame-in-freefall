import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, RotateCcw, Search, Sparkles } from 'lucide-react';
import { DataProvider, RetryContext } from './data/DataProvider';
import { useDataState } from './data/useData';
import type { Scenario } from './data/types';
import { UiContext, type BoardCardType, type ExplanationMode, type TablePreset, type TableRequest, type UiActions } from './state/ui';
import { BoardContext, useBoard, useBoardState, type CardType, type ViewId } from './state/board';
import { ErrorState, Skeleton } from './components/ui';
import { Console } from './sections/Console';
import { Sidebar } from './assistant/Sidebar';

const MAIN_TABS: { view: ViewId; label: string }[] = [
  { view: 'overview', label: 'Overview' },
  { view: 'explore', label: 'Explore' },
  { view: 'coverage', label: 'Coverage' },
  { view: 'gaps', label: 'Gaps' },
];
const MORE_TABS: { view: ViewId; label: string }[] = [
  { view: 'scenarios', label: 'Scenarios' },
  { view: 'fuels', label: 'Fuels' },
  { view: 'materials', label: 'Materials' },
  { view: 'sources', label: 'Sources' },
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
};

function BrandEmblem() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" fill="none" stroke="var(--silver)" strokeOpacity="0.5" />
      <circle cx="13" cy="13" r="6" fill="var(--flame-blue)" fillOpacity="0.55" />
      <circle cx="13" cy="13" r="2.2" fill="var(--ink)" />
    </svg>
  );
}

function Nav({ onAssistant, open, mode, onMode, customizeOpen, onCustomize, view, onView, nTests, nPrograms }: {
  onAssistant: () => void; open: boolean; mode: ExplanationMode; onMode: (m: ExplanationMode) => void;
  customizeOpen: boolean; onCustomize: (v: boolean) => void; view: ViewId; onView: (v: ViewId) => void;
  nTests?: number; nPrograms?: number;
}) {
  const { undo, canUndo } = useBoard();
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!more) return;
    const onDown = (e: PointerEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMore(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [more]);
  const moreActive = MORE_TABS.some((t) => t.view === view);

  return (
    <nav className="nav" aria-label="Views">
      <div className="nav-in">
        <button type="button" className="brand" onClick={() => onView('overview')}><BrandEmblem /> Flame in Freefall</button>
        <ul className="nav-links" role="list">
          {MAIN_TABS.map((t) => (
            <li key={t.view}>
              <button type="button" className={view === t.view ? 'nav-pill-active' : undefined} aria-current={view === t.view ? 'page' : undefined} onClick={() => onView(t.view)}>{t.label}</button>
            </li>
          ))}
          <li className="nav-more" ref={moreRef}>
            <button type="button" className={moreActive ? 'nav-pill-active' : undefined} aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((m) => !m)}>
              More <ChevronDown size={12} aria-hidden="true" />
            </button>
            {more && (
              <div className="cmenu-pop glass nav-more-pop" role="menu">
                {MORE_TABS.map((t) => (
                  <button key={t.view} type="button" role="menuitem" onClick={() => { onView(t.view); setMore(false); }}>{t.label}</button>
                ))}
              </div>
            )}
          </li>
        </ul>

        <div className="nav-right">
          {nTests != null && nPrograms != null && !customizeOpen && (
            <div className="status-pill num" aria-label="Dataset status"><i aria-hidden="true" />{nTests} tests · {nPrograms} investigations</div>
          )}
          {!customizeOpen ? (
            <>
              <button type="button" className="ask-trigger" onClick={onAssistant} aria-expanded={open} aria-controls="assistant" aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
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
  const [scenarioId, setScenarioId] = useState<Scenario['id']>('lunar_challenge');
  const [mode, setMode] = useState<ExplanationMode>('explorer');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [view, setView] = useState<ViewId>('overview');

  const openView = useCallback((v: ViewId) => { setView(v); setCustomizeOpen(false); }, []);
  const closeView = useCallback(() => setView('overview'), []);

  const showTests = useCallback((req: TableRequest) => {
    setPreset({ ...req, token: Date.now() });
    openView('explore');
  }, [openView]);

  const openAssistant = useCallback((question?: string) => {
    setOpen(true);
    if (question) setPending({ token: Date.now(), question });
  }, []);

  const { add, undo } = boardApi;
  const setExtraCard = useCallback<NonNullable<UiActions['setExtraCard']>>((card) => {
    if (!card) { undo(); return; }
    const target = SI_CARD[card.type];
    if (target === 'table') openView('explore');
    else if (target !== 'materials_view') add(target, card.addedBy);
  }, [add, undo, openView]);

  const actions = useMemo<UiActions>(
    () => ({ showTests, openAssistant, scenarioId, setScenarioId, mode, setMode, customizeOpen, setCustomizeOpen, view, openView, closeView, setExtraCard }),
    [showTests, openAssistant, scenarioId, mode, customizeOpen, view, openView, closeView, setExtraCard],
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
  const meta = ready ? state.data.meta : undefined;

  return (
    <BoardContext.Provider value={boardApi}>
      <UiContext.Provider value={actions}>
        <div className="app-shell">
          <a className="skip" href="#main">Skip to content</a>
          <Nav
            onAssistant={() => setOpen((o) => !o)} open={open} mode={mode} onMode={setMode}
            customizeOpen={customizeOpen} onCustomize={setCustomizeOpen} view={view} onView={openView}
            nTests={meta?.n_tests} nPrograms={meta?.programs.length}
          />
          <main id="main" tabIndex={-1} className="app-main">
            {state.status === 'loading' && <Loading />}
            {state.status === 'error' && <div className="section"><ErrorState message={state.message} onRetry={retry} /></div>}
            {ready && <Console preset={preset} />}
          </main>
          {ready && <Sidebar open={open} onClose={() => setOpen(false)} pending={pending} />}
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
