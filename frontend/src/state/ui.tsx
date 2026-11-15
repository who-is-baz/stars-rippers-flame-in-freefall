// Cross-section actions & console state: "show these tests in the table", "open the assistant",
// active atmosphere scenario, Explorer/Engineer mode, Customize mode and the full-view panel.
import { createContext, useContext } from 'react';
import type { O2Band, PressureLevel, Program, Scenario } from '../data/types';
import type { ViewId } from './board';

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
  // Opens the assistant with the question typed in the box but NOT sent (the user reviews and sends it).
  prefillAssistant?: (question: string) => void;
  scenarioId?: Scenario['id'];
  setScenarioId?: (id: Scenario['id']) => void;
  mode?: ExplanationMode;
  setMode?: (m: ExplanationMode) => void;
  customizeOpen?: boolean;
  setCustomizeOpen?: (open: boolean) => void;
  view?: ViewId | null;                       // full-view panel over the console (null = console only)
  openView?: (v: ViewId) => void;
  closeView?: () => void;
  // Used by the SI assistant: asks the board to add a card (null = undo the last change).
  setExtraCard?: (card: { type: BoardCardType; addedBy: 'user' | 'si'; title: string } | null) => void;
}

export const UiContext = createContext<UiActions>({
  showTests: () => {},
  openAssistant: () => {},
});

export const useUi = (): UiActions => useContext(UiContext);
