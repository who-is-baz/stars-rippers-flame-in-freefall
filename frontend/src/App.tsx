import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, RotateCcw, Search, Sparkles } from 'lucide-react';
import { DataProvider, RetryContext } from './data/DataProvider';
import { useDataState, useMeta } from './data/useData';
import type { Scenario } from './data/types';
import {
  UiContext,
  type BoardCardType,
  type ExplanationMode,
  type TablePreset,
  type TableRequest,
  type UiActions,
} from './state/ui';
import { Doi, ErrorState, Skeleton } from './components/ui';
import { Hero } from './sections/Hero';
import { ScenarioExplorer } from './sections/ScenarioExplorer';
import { CoverageMap } from './sections/CoverageMap';
import { ExperimentTable } from './sections/ExperimentTable';
import { FuelComparison } from './sections/FuelComparison';
import { Materials } from './sections/Materials';
import { Gaps } from './sections/Gaps';
import { Sidebar } from './assistant/Sidebar';

const NAV: { href: string; label: string }[] = [
  { href: '#top', label: 'Overview' },
  { href: '#experiments', label: 'Explore' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#fuels', label: 'Fuels' },
  { href: '#materials', label: 'Materials' },
  { href: '#gaps', label: 'Gaps' },
];
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

function BrandEmblem() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" fill="none" stroke="var(--silver)" strokeOpacity="0.5" />
      <circle cx="13" cy="13" r="6" fill="var(--flame-blue)" fillOpacity="0.55" />
      <circle cx="13" cy="13" r="2.2" fill="var(--ink)" />
    </svg>
  );
}

function Nav({
  onAssistant,
  open,
  mode,
  onMode,
  customizeOpen,
  onCustomize,
  onUndo,
  hasUndo,
  nTests,
  nPrograms,
}: {
  onAssistant: () => void;
  open: boolean;
  mode: ExplanationMode;
  onMode: (m: ExplanationMode) => void;
  customizeOpen: boolean;
  onCustomize: (v: boolean) => void;
  onUndo: () => void;
  hasUndo: boolean;
  nTests?: number;
  nPrograms?: number;
}) {
  return (
    <nav className="nav" aria-label="Sections">
      <div className="nav-in">
        <a className="brand" href="#top">
          <BrandEmblem /> Flame in Freefall
        </a>
        <ul className="nav-links" role="list">
          {NAV.map((n, idx) => (
            <li key={n.href}>
              <a href={n.href} className={idx === 0 ? 'nav-pill-active' : undefined}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav-right">
          {nTests != null && nPrograms != null && !customizeOpen && (
            <div className="status-pill num" aria-label="Dataset status">
              <i aria-hidden="true" />
              {nTests} tests · {nPrograms} investigations
            </div>
          )}

          {!customizeOpen ? (
            <>
              <button
                type="button"
                className="ask-trigger"
                onClick={onAssistant}
                aria-expanded={open}
                aria-controls="assistant"
                aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
              >
                <Sparkles size={14} color="var(--mint)" aria-hidden="true" />
                <span>Ask the SI assistant…</span>
                <span className="kbd" aria-hidden="true">
                  {SHORTCUT}
                </span>
                <Search size={14} color="var(--silver)" aria-hidden="true" />
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCustomize(true)}
                aria-pressed={customizeOpen}
              >
                <LayoutGrid size={13} aria-hidden="true" /> Customize
              </button>

              <div className="seg seg-compact" role="group" aria-label="Explanation mode">
                <button
                  type="button"
                  aria-pressed={mode === 'explorer'}
                  onClick={() => onMode('explorer')}
                >
                  Explorer
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'engineer'}
                  onClick={() => onMode('engineer')}
                >
                  Engineer
                </button>
              </div>
            </>
          ) : (
            <div className="row">
              <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>
                Editing board
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={!hasUndo}
                onClick={onUndo}
              >
                <RotateCcw size={13} aria-hidden="true" /> Undo
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onCustomize(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const meta = useMeta();
  return (
    <footer className="footer">
      <div className="footer-in">
        <p>
          <strong>Data:</strong> NASA Physical Sciences Informatics (PSI), license {meta.license}.{' '}
          {meta.programs.map((p, i) => (
            <span key={p.program}>
              {i > 0 && ' · '}
              {p.program} ({p.psi_id}): <Doi doi={p.source_doi} />
            </span>
          ))}
        </p>
        <p>
          <strong>Code:</strong> Apache-2.0 license. <strong>Interface design assisted by AI.</strong>{' '}
          Outcomes marked &ldquo;AI-extracted&rdquo; await human review.
        </p>
        <p>
          Built by Stars Rippers for the NASA Space Apps Challenge 2026. Uses NASA PSI open data (CC0). Not endorsed by NASA.
          No predictive model. Not safety guidance. Data files generated {meta.generated_utc.slice(0, 10)} by {meta.generated_by}.
        </p>
      </div>
    </footer>
  );
}

function Loading() {
  return (
    <div className="section" role="status" aria-label="Loading data">
      <div className="stack" style={{ paddingTop: 48 }}>
        <Skeleton h={18} w="220px" />
        <Skeleton h={72} w="min(560px, 90%)" />
        <Skeleton h={22} w="min(640px, 100%)" />
        <div className="stats">
          <Skeleton h={132} />
          <Skeleton h={132} />
          <Skeleton h={132} />
        </div>
        <Skeleton h={280} />
      </div>
    </div>
  );
}

function Page() {
  const state = useDataState();
  const retry = useContext(RetryContext);
  const [preset, setPreset] = useState<TablePreset | null>(null);
  // Deep link: opening the page at #assistant shows the panel straight away.
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#assistant');
  const [pending, setPending] = useState<{ token: number; question: string } | null>(null);
  const [scenarioId, setScenarioId] = useState<Scenario['id']>('lunar_challenge');
  const [mode, setMode] = useState<ExplanationMode>('explorer');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [extraCard, setExtraCard] = useState<{
    type: BoardCardType;
    addedBy: 'user' | 'si';
    title: string;
  } | null>(null);

  const showTests = useCallback((req: TableRequest) => {
    setPreset({ ...req, token: Date.now() });
    const el = document.getElementById('experiments');
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const openAssistant = useCallback((question?: string) => {
    setOpen(true);
    if (question) setPending({ token: Date.now(), question });
  }, []);

  const actions = useMemo<UiActions>(
    () => ({
      showTests,
      openAssistant,
      scenarioId,
      setScenarioId,
      mode,
      setMode,
      customizeOpen,
      setCustomizeOpen,
      extraCard,
      setExtraCard,
    }),
    [showTests, openAssistant, scenarioId, mode, customizeOpen, extraCard],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ready = state.status === 'ready';
  const meta = ready ? state.data.meta : undefined;

  return (
    <UiContext.Provider value={actions}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav
        onAssistant={() => setOpen((o) => !o)}
        open={open}
        mode={mode}
        onMode={setMode}
        customizeOpen={customizeOpen}
        onCustomize={setCustomizeOpen}
        onUndo={() => setExtraCard(null)}
        hasUndo={extraCard != null}
        nTests={meta?.n_tests}
        nPrograms={meta?.programs.length}
      />
      <main id="main" tabIndex={-1}>
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && (
          <div className="section">
            <ErrorState message={state.message} onRetry={retry} />
          </div>
        )}
        {ready && (
          <>
            <Hero />
            <ScenarioExplorer />
            <CoverageMap />
            <FuelComparison />
            <ExperimentTable preset={preset} />
            <Materials />
            <Gaps />
          </>
        )}
      </main>
      {ready && <Footer />}
      {ready && (
        <>
          {!open && (
            <button
              type="button"
              className="btn btn-primary fab"
              onClick={() => setOpen(true)}
              aria-controls="assistant"
              aria-expanded={false}
            >
              <Sparkles size={16} aria-hidden="true" /> Ask SI{' '}
              <span
                className="kbd"
                aria-hidden="true"
                style={{ color: 'inherit', borderColor: 'currentColor' }}
              >
                {SHORTCUT}
              </span>
            </button>
          )}
          <Sidebar open={open} onClose={() => setOpen(false)} pending={pending} />
        </>
      )}
    </UiContext.Provider>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Page />
    </DataProvider>
  );
}
