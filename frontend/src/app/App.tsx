import type { ReactNode } from 'react';
import { DataProvider } from '../data/DataProvider';
import { useDataState } from '../data/useData';
import { AssistantProvider, ExplainModeProvider, ScenarioProvider } from '../providers';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';
import { Nav } from './Nav';
import { ROUTE_LABEL, useLocation, type Location } from './routes';
import { Overview } from '../views/Overview';
import { Explorer } from '../views/Explorer';
import { Coverage } from '../views/Coverage';
import { Gaps } from '../views/Gaps';
import { Materials } from '../views/Materials';
import { AssistantPanel } from '../assistant/AssistantPanel';
import s from './App.module.css';

// Muestra loading/error claro en vez de una pantalla en blanco si algún JSON falla.
function DataGate({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
  const st = useDataState();
  if (quiet && st.status !== 'ready') return null; // panel y footer: el mensaje ya lo da la vista
  if (st.status === 'loading') return <p role="status" className={s.stat}>Loading data…</p>;
  if (st.status === 'error') {
    return (
      <div role="alert" className={s.notice}>
        <h2>Data could not be loaded</h2>
        <p>{st.message}. Reload the page; if it keeps failing, the data files are missing or malformed.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function View({ loc }: { loc: Location }) {
  switch (loc.route) {
    case 'overview': return <Overview />;
    case 'explorer': return <Explorer loc={loc} />;
    case 'coverage': return <Coverage loc={loc} />;
    case 'gaps': return <Gaps />;
    case 'materials': return <Materials />;
  }
}

function Shell() {
  const loc = useLocation();
  const { route } = loc;
  return (
    <div className={s.shell}>
      <Nav active={route} />
      <div className={s.body}>
        <main className={s.main} id="main">
          <DataGate>
            {/* key por hash: cada vista tiene su ErrorBoundary y se reinicia al navegar con otros filtros */}
            <ErrorBoundary key={window.location.hash || route} label={ROUTE_LABEL[route]}>
              <View loc={loc} />
            </ErrorBoundary>
          </DataGate>
        </main>
        {/* Panel SI acoplado a la derecha (no modal, no ruta) */}
        <DataGate quiet><ErrorBoundary label="SI assistant"><AssistantPanel /></ErrorBoundary></DataGate>
      </div>
      <DataGate quiet><Footer /></DataGate>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <ScenarioProvider>
        <ExplainModeProvider>
          <AssistantProvider>
            <Shell />
          </AssistantProvider>
        </ExplainModeProvider>
      </ScenarioProvider>
    </DataProvider>
  );
}
