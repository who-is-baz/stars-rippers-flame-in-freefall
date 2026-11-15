// Values of the three scene instruments (oxygen, pressure, airflow). They come from the selected scenario or the Custom controls,
// never from a model. Airflow is shown ONLY when a measured value exists in the matching tests; otherwise it is "conceptual".
import type { ExperimentRow, Meta } from '../data/types';
import type { AirflowFile } from '../data/types';
import { psiOf, type Crit } from './explorer';
import type { Atmosphere } from './relevance';

export const O2_REFERENCE = 0.21;       // Earth air
export const PSI_REFERENCE = 14.7;      // 1 atm in psi, as used in scenarios.json
const SIGN = { point: '', min: '≥', max: '≤' } as const;
export const critText = (c: Crit, unit: 'o2' | 'psi'): string =>
  `${SIGN[c.kind]}${unit === 'o2' ? `${+(c.value * 100).toFixed(1)}%` : `${+c.value.toFixed(1)} psi`}`;
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Upper end of the pressure scale: the highest FLEX pressure in the data (psi), rounded up to 5. Not typed by hand. */
export function pressureScaleMax(rows: ExperimentRow[]): number {
  const p = rows.filter((r) => r.program === 'FLEX' && r.pressure_atm != null).map((r) => psiOf(r.pressure_atm as number));
  return Math.ceil(Math.max(...p, PSI_REFERENCE) / 5) * 5;
}

export type Airflow =
  | { kind: 'measured'; min: number; max: number; n: number; nMatched: number; unit: string; doi: string }
  | { kind: 'conceptual' };

/** Air speed range among BASS-II tests whose O₂ is within tolerance of the atmosphere (BASS-II records no pressure, so only O₂ can match). */
export function airflowFor(rows: ExperimentRow[], file: AirflowFile, atm: Atmosphere, meta: Meta): Airflow {
  const tol = meta.tolerance.o2_fraction, EPS = 1e-9;
  const speed = new Map(file.items.map((i) => [i.test_id, i.air_speed_cm_s] as const));
  const near = rows.filter((r) => r.program === 'BASS-II' && (atm.o2.kind === 'point' ? Math.abs(r.o2_fraction - atm.o2.value) <= tol + EPS
    : atm.o2.kind === 'min' ? r.o2_fraction >= atm.o2.value - tol - EPS : r.o2_fraction <= atm.o2.value + tol + EPS));
  const v = near.map((r) => speed.get(r.test_id)).filter((x): x is number => x != null);
  if (v.length === 0) return { kind: 'conceptual' };
  return { kind: 'measured', min: Math.min(...v), max: Math.max(...v), n: v.length, nMatched: near.length, unit: file.unit, doi: file.source_doi };
}
