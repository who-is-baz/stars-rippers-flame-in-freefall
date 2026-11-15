// Test helper: renders a component with the REAL data files from public/data, so tests check real numbers.
import { useState, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { DataContext, type DataBundle } from '../data/DataProvider';
import { BoardContext, useBoardState, type ViewId } from '../state/board';
import { UiContext } from '../state/ui';
import type { Scenario } from '../data/types';
import meta from '../../public/data/meta.json';
import scenarios from '../../public/data/scenarios.json';
import coverage from '../../public/data/coverage.json';
import experiments from '../../public/data/experiments.json';
import gaps from '../../public/data/gaps.json';
import materials from '../../public/data/materials.json';
import answers from '../../public/data/answers.json';
import airflow from '../../public/data/airflow.json';

export const data = { meta, scenarios, coverage, experiments, gaps, materials, answers, airflow } as unknown as DataBundle;

export const renderWithData = (ui: ReactElement) =>
  render(<DataContext.Provider value={{ status: 'ready', data }}>{ui}</DataContext.Provider>);

// Same wiring as <App/> for the board, scenario and view state, without the assistant or the nav.
function Host({ children }: { children: ReactElement }) {
  const board = useBoardState();
  const [scenarioId, setScenarioId] = useState<Scenario['id']>('lunar_challenge');
  const [view, setView] = useState<ViewId>('overview');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  return (
    <BoardContext.Provider value={board}>
      <UiContext.Provider
        value={{
          showTests: () => {}, openAssistant: () => {}, scenarioId, setScenarioId, customizeOpen, setCustomizeOpen,
          view, openView: setView, closeView: () => setView('overview'),
        }}
      >
        {children}
      </UiContext.Provider>
    </BoardContext.Provider>
  );
}

export const renderWithBoard = (ui: ReactElement) => renderWithData(<Host>{ui}</Host>);
