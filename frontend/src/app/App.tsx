import type { ReactNode } from 'react';
import { DataProvider } from '../data/DataProvider';
import { useDataState } from '../data/useData';
import { AssistantProvider, ExplainModeProvider, ScenarioProvider } from '../providers';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';
import { Nav } from './Nav';
import { ROUTE_LABEL, useLocation, type Route } from './routes';
import { Placeholder } from '../views/Placeholder';
import s from './App.module.css';

const BLURB: Record<Route, string> = {
  overview: 'Pick an atmosphere and see how many tests match it.',
  explorer: 'Browse every test with its source.',
  coverage: 'See which oxygen and pressure combinations were tested.',
  gaps: 'See what the data does not cover.',
  materials: 'See which solid materials were shown to burn.',
};

// Muestra loading/error claro en vez de una pantalla en blanco si algún JSON falla.
function DataGate({ children }: { children: ReactNode }) {
  const st = useDataState();
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

function Shell() {
  const { route } = useLocation();
  return (
    <div className={s.shell}>
      <Nav active={route} />
      <main className={s.main}>
        <DataGate>
          {/* key por ruta: cada vista tiene su propio ErrorBoundary y se reinicia al navegar */}
          <ErrorBoundary key={route} label={ROUTE_LABEL[route]}>
            <Placeholder title={ROUTE_LABEL[route]} blurb={BLURB[route]} />
          </ErrorBoundary>
        </DataGate>
      </main>
      <DataGate><Footer /></DataGate>
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
