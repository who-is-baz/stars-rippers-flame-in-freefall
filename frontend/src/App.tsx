import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { DataProvider, RetryContext } from './data/DataProvider';
import { useDataState, useMeta } from './data/useData';
import { UiContext, type TablePreset, type TableRequest, type UiActions } from './state/ui';
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
  { href: '#scenarios', label: 'Scenarios' }, { href: '#coverage', label: 'Coverage' }, { href: '#experiments', label: 'Experiments' },
  { href: '#fuels', label: 'Fuels' }, { href: '#materials', label: 'Materials' }, { href: '#gaps', label: 'Gaps' },
];
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

function Nav({ onAssistant, open }: { onAssistant: () => void; open: boolean }) {
  return (
    <nav className="nav" aria-label="Sections">
      <div className="nav-in">
        <a className="brand" href="#top"><Flame size={18} aria-hidden="true" /> Flame in Freefall</a>
        <ul className="nav-links">
          {NAV.map((n) => <li key={n.href}><a href={n.href}>{n.label}</a></li>)}
        </ul>
        <button type="button" className="btn btn-sm" onClick={onAssistant} aria-expanded={open} aria-controls="assistant"
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
          <Sparkles size={14} aria-hidden="true" /> SI Assistant <span className="kbd" aria-hidden="true">{SHORTCUT}</span>
        </button>
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
          {meta.programs.map((p, i) => <span key={p.program}>{i > 0 && ' · '}{p.program} ({p.psi_id}): <Doi doi={p.source_doi} /></span>)}
        </p>
        <p><strong>Code:</strong> Apache-2.0 license. <strong>Interface design assisted by AI.</strong> Outcomes marked &ldquo;AI-extracted&rdquo; await human review.</p>
        <p>
          Built by Stars Rippers for the NASA Space Apps Challenge 2026. This is an independent student project; it is not affiliated with or endorsed by NASA.
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
        <Skeleton h={18} w="220px" /><Skeleton h={72} w="min(560px, 90%)" /><Skeleton h={22} w="min(640px, 100%)" />
        <div className="stats"><Skeleton h={132} /><Skeleton h={132} /><Skeleton h={132} /></div>
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

  const showTests = useCallback((req: TableRequest) => {
    setPreset({ ...req, token: Date.now() });
    const el = document.getElementById('experiments');
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView();
  }, []);
  const openAssistant = useCallback((question?: string) => {
    setOpen(true);
    if (question) setPending({ token: Date.now(), question });
  }, []);
  const actions = useMemo<UiActions>(() => ({ showTests, openAssistant }), [showTests, openAssistant]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ready = state.status === 'ready';
  return (
    <UiContext.Provider value={actions}>
      <a className="skip" href="#main">Skip to content</a>
      <Nav onAssistant={() => setOpen((o) => !o)} open={open} />
      <main id="main">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <div className="section"><ErrorState message={state.message} onRetry={retry} /></div>}
        {ready && (
          <>
            <Hero />
            <ScenarioExplorer />
            <CoverageMap />
            <ExperimentTable preset={preset} />
            <FuelComparison />
            <Materials />
            <Gaps />
          </>
        )}
      </main>
      {ready && <Footer />}
      {ready && (
        <>
          {!open && (
            <button type="button" className="btn btn-primary fab" onClick={() => setOpen(true)} aria-controls="assistant" aria-expanded={false}>
              <Sparkles size={16} aria-hidden="true" /> Ask SI <span className="kbd" aria-hidden="true" style={{ color: 'inherit', borderColor: 'currentColor' }}>{SHORTCUT}</span>
            </button>
          )}
          <Sidebar open={open} onClose={() => setOpen(false)} pending={pending} />
        </>
      )}
    </UiContext.Provider>
  );
}

export default function App() {
  return <DataProvider><Page /></DataProvider>;
}
