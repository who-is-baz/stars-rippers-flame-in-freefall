// Classifies rows into the bands/levels defined in meta.json (it only filters; it computes no statistics).
import type { ExperimentRow, Meta, O2Band, PressureLevel } from '../data/types';

export const o2BandOf = (o2: number, meta: Meta): O2Band | null =>
  meta.o2_bands.find((b) => o2 >= b.min_inclusive && o2 < b.max_exclusive)?.label ?? null;

export const pressureLevelOf = (atm: number | null, meta: Meta): PressureLevel | null =>
  atm == null ? null : meta.pressure_levels.find((l) => atm >= l.atm_min && (l.atm_max == null || atm < l.atm_max))?.label ?? null;

export type Suppressant = 'none' | 'co2' | 'he';
// FLEX: the suppressant is added CO₂ or He. BASS-II: CO₂ is measured in the chamber, not a suppressant → not applicable.
export const suppressantOf = (r: ExperimentRow): Suppressant | null => {
  if (r.program !== 'FLEX') return null;
  if ((r.he_fraction ?? 0) > 0) return 'he';
  if ((r.co2_fraction ?? 0) > 0) return 'co2';
  return 'none';
};

export const rowKey = (r: ExperimentRow, i: number) => `${r.program}:${r.test_id}:${i}`;
