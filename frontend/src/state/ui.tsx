// Cross-section actions & console state: "show these tests in the table", "open the assistant",
// active atmosphere scenario, Explorer/Engineer mode, and Customize/SI board state.
import { createContext, useContext } from 'react';
import type { O2Band, PressureLevel, Program, Scenario } from '../data/types';

// A preset replaces the table filters. `token` changes on every request so the same preset can be re-applied.
export interface TablePreset {
  token: number;
  label?: string;       // shown when filtering by an explicit list of test IDs
  ids?: string[];
  program?: Program;
  fuel?: string;
  o2Band?: O2Band;
  pressure?: PressureLevel;
}
export type TableRequest = Omit<TablePreset, 'token'>;

export type ExplanationMode = 'explorer' | 'engineer';
export type BoardCardType = 'burning_rate_line' | 'outcomes_bars' | 'coverage_heatmap' | 'materials_bars' | 'tests_scatter';

export interface UiActions {
  showTests: (req: TableRequest) => void;
  openAssistant: (question?: string) => void;
  scenarioId?: Scenario['id'];
  setScenarioId?: (id: Scenario['id']) => void;
  mode?: ExplanationMode;
  setMode?: (m: ExplanationMode) => void;
  customizeOpen?: boolean;
  setCustomizeOpen?: (open: boolean) => void;
  extraCard?: { type: BoardCardType; addedBy: 'user' | 'si'; title: string } | null;
  setExtraCard?: (card: { type: BoardCardType; addedBy: 'user' | 'si'; title: string } | null) => void;
}

export const UiContext = createContext<UiActions>({
  showTests: () => {},
  openAssistant: () => {},
});

export const useUi = (): UiActions => useContext(UiContext);
