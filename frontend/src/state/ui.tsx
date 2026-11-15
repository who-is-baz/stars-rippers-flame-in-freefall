// Cross-section actions: "show these tests in the table" and "open the assistant".
import { createContext, useContext } from 'react';
import type { O2Band, PressureLevel, Program } from '../data/types';

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

export interface UiActions {
  showTests: (req: TableRequest) => void;
  openAssistant: (question?: string) => void;
}
export const UiContext = createContext<UiActions>({ showTests: () => {}, openAssistant: () => {} });
export const useUi = (): UiActions => useContext(UiContext);
