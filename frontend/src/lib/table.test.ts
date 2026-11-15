import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import { EMPTY_FILTERS, filterRows, sortRows, toCsv } from './table';

const rows = data.experiments.items;
describe('experiment table logic', () => {
  it('suppressant derived from CO₂/He fractions matches the counts in answers.json (q08)', () => {
    const n = (s: 'none' | 'co2' | 'he') => filterRows(rows, { ...EMPTY_FILTERS, suppressant: s }, data.meta).length;
    expect([n('none'), n('co2'), n('he')]).toEqual([101, 123, 50]);
  });
  it('coverage-cell filter returns the same n as coverage.json', () => {
    for (const c of data.coverage.cells) {
      const got = filterRows(rows, { ...EMPTY_FILTERS, program: 'FLEX', kind: c.fuel, o2Band: c.o2_band, pressure: c.pressure_level }, data.meta);
      expect(got.length).toBe(c.n);
    }
  });
  it('missing values sort last in both directions', () => {
    for (const dir of ['asc', 'desc'] as const) {
      const sorted = sortRows(rows, { key: 'pressure_atm', dir });
      expect(sorted[0].pressure_atm).not.toBeNull();
      expect(sorted[sorted.length - 1].pressure_atm).toBeNull();
    }
  });
  it('extinction diameter exists only on extinction rows', () => {
    expect(rows.filter((r) => r.extinction_diameter_mm != null && r.outcome !== 'extinction')).toEqual([]);
  });
  it('CSV has one line per row plus the header', () => {
    const csv = toCsv(rows.slice(0, 3), data.experiments.columns);
    expect(csv.split('\n')).toHaveLength(4);
    expect(csv.split('\n')[0]).toBe(data.experiments.columns.join(','));
  });
});
