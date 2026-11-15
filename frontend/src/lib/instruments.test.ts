import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import type { ExperimentRow } from '../data/types';
import { PSI_REFERENCE, airflowFor, clamp01, critText, pressureScaleMax } from './instruments';
import type { Atmosphere } from './relevance';

const rows = data.experiments.items as ExperimentRow[];
const atm = (id: string): Atmosphere => { const s = data.scenarios.scenarios.find((x) => x.id === id)!; return { o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi }; };

describe('instrument values', () => {
  it('criterion text keeps ≥ / ≤ and units', () => {
    expect(critText({ kind: 'point', value: 0.21 }, 'o2')).toBe('21%');
    expect(critText({ kind: 'min', value: 0.3 }, 'o2')).toBe('≥30%');
    expect(critText({ kind: 'max', value: 10.2 }, 'psi')).toBe('≤10.2 psi');
    expect(PSI_REFERENCE).toBe(14.7);
  });
  it('pressure scale max comes from the data (highest FLEX pressure, rounded up to 5)', () => {
    expect(pressureScaleMax(rows)).toBe(45);
    expect(clamp01(2)).toBe(1); expect(clamp01(-1)).toBe(0);
  });
});

describe('airflow indicator never invents values', () => {
  it('Earth/ISS: BASS-II tests at ~21 % O₂ have a measured range, with n and the unit', () => {
    const a = airflowFor(rows, data.airflow, atm('earth_iss'), data.meta);
    expect(a.kind).toBe('measured');
    if (a.kind !== 'measured') return;
    const near = rows.filter((r) => r.program === 'BASS-II' && Math.abs(r.o2_fraction - 0.21) <= 0.01 + 1e-9);
    const ids = new Set(data.airflow.items.map((i) => i.test_id));
    expect(a.nMatched).toBe(near.length);
    expect(a.n).toBe(near.filter((r) => ids.has(r.test_id)).length);
    const vals = data.airflow.items.filter((i) => near.some((r) => r.test_id === i.test_id)).map((i) => i.air_speed_cm_s);
    expect([a.min, a.max]).toEqual([Math.min(...vals), Math.max(...vals)]);
    expect(a.unit).toBe('cm/s');
    expect(a.n).toBeLessThanOrEqual(a.nMatched);
  });
  it('Moon base / Spacesuit: no BASS-II test at that O₂ → "conceptual", no number', () => {
    for (const id of ['lunar_challenge', 'suit', 'exploration']) expect(airflowFor(rows, data.airflow, atm(id), data.meta)).toEqual({ kind: 'conceptual' });
  });
});
