// State of the "Custom" atmosphere explorer that other Overview cards need to read (the inspector mirrors it).
import { createContext, useContext } from 'react';
import type { Crit } from '../lib/explorer';

export interface CustomSummary {
  atmosphere: string;   // e.g. "21% O₂ · 14.7 psi (1.00 atm)" (with ≥/≤ when a preset criterion is kept)
  fuel: string;         // "heptane and methanol" | "heptane" | "methanol"
  suppressant: string;  // "any suppressant" | "no suppressant" | "CO₂ added" | "He added"
  n: number;            // matched tests (near)
  n_exact: number;
  ids: string[];
  // numeric settings, so other panels can reuse the SAME atmosphere without re-parsing text
  o2: Crit; pressure_psi: Crit; fuelRaw: 'any' | 'heptane' | 'methanol'; suppressantRaw: 'any' | 'none' | 'co2' | 'he';
}
export interface CustomState { active: boolean; summary: CustomSummary | null }

export const CustomContext = createContext<CustomState>({ active: false, summary: null });
export const useCustom = (): CustomState => useContext(CustomContext);
