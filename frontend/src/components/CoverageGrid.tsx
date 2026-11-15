// Mapa de calor O₂ × presión para un combustible (flame-data-viz §3 Heatmap). Sin radar: mini-cuadrícula.
import type { CoverageCell, Fuel, Meta } from '../data/types';
import { fmtBand } from '../lib/format';
import { isSmallN } from '../lib/honesty';
import s from './CoverageGrid.module.css';

export type Metric = 'n' | 'rate';
export const cellKey = (c: Pick<CoverageCell, 'fuel' | 'o2_band' | 'pressure_level'>) => `${c.fuel}|${c.o2_band}|${c.pressure_level}`;

// Escala de color por n (cubetas fijas de visualización, no una estadística).
const nFill = (n: number) => (n === 0 ? undefined : n < 5 ? 'var(--cov-1)' : n < 10 ? 'var(--cov-2)' : n < 20 ? 'var(--cov-3)' : 'var(--cov-4)');
export const N_LEGEND = [
  { label: 'No tests', swatch: 'transparent', pattern: 'stripe' as const },
  { label: 'n < 5 (small sample)', swatch: 'var(--cov-1)', pattern: 'warn' as const },
  { label: '5–9', swatch: 'var(--cov-2)' }, { label: '10–19', swatch: 'var(--cov-3)' }, { label: '20+', swatch: 'var(--cov-4)' },
];
const SEQ = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];

interface Props {
  fuel: Fuel; cells: CoverageCell[]; meta: Meta; metric?: Metric; mini?: boolean;
  highlight?: Set<string>; selected?: string | null; onSelect?: (c: CoverageCell) => void;
  rateDomain?: [number, number];
}

export function CoverageGrid({ fuel, cells, meta, metric = 'n', mini, highlight, selected, onSelect, rateDomain }: Props) {
  const bands = meta.o2_bands.map((b) => b.label);
  const levels = [...meta.pressure_levels].reverse().map((l) => l.label); // alta presión arriba
  const byKey = new Map(cells.filter((c) => c.fuel === fuel).map((c) => [cellKey(c), c]));
  const rateFill = (v: number | null) => {
    if (v == null || !rateDomain) return undefined;
    const [lo, hi] = rateDomain;
    return SEQ[Math.min(4, Math.max(0, Math.floor(((v - lo) / (hi - lo || 1)) * 5)))];
  };
  const caption = `${fuel === 'heptane' ? 'Heptane' : 'Methanol'}: ${metric === 'n' ? 'number of FLEX tests' : 'average burning rate (mm²/s)'} by O₂ band and pressure level`;
  return (
    <table className={`${s.grid} ${mini ? s.mini : ''}`}>
      <caption className={mini ? 'sr-only' : s.caption}>
        <span className={s.fuelDot} style={{ background: `var(--fuel-${fuel})` }} aria-hidden="true" />{caption}
      </caption>
      <thead>
        <tr><th scope="col"><span className="sr-only">Pressure</span></th>{bands.map((b) => <th key={b} scope="col">{fmtBand(b).replace(' O₂', '')}</th>)}</tr>
      </thead>
      <tbody>
        {levels.map((lvl) => (
          <tr key={lvl}>
            <th scope="row">{lvl}</th>
            {bands.map((b) => {
              const c = byKey.get(`${fuel}|${b}|${lvl}`);
              if (!c) return <td key={b} />;
              const k = cellKey(c), small = c.n > 0 && isSmallN(c.n, meta.min_n);
              const value = metric === 'n' ? String(c.n) : c.avg_burning_rate_mm2_s == null ? '–' : c.avg_burning_rate_mm2_s.toFixed(2);
              const fill = metric === 'n' ? nFill(c.n) : rateFill(c.avg_burning_rate_mm2_s);
              const cls = [s.cell, c.n === 0 ? s.empty : '', small ? s.small : '', highlight?.has(k) ? s.hl : '', selected === k ? s.sel : ''].join(' ');
              const label = `${fmtBand(b)}, ${lvl}: ${c.n === 0 ? 'no tests' : `n = ${c.n}`}${small ? ', small sample' : ''}${metric === 'rate' && c.avg_burning_rate_mm2_s != null ? `, average burning rate ${value} mm²/s from n = ${c.n_burning_rate}` : ''}${highlight?.has(k) ? ', contains scenario tests' : ''}`;
              const inner = <>{value}{small && <span aria-hidden="true">⚠</span>}</>;
              return (
                <td key={b}>
                  {onSelect && !mini ? (
                    <button type="button" className={cls} style={{ background: fill }} aria-label={label} aria-pressed={selected === k} onClick={() => onSelect(c)}>{inner}</button>
                  ) : (
                    <span className={cls} style={{ background: fill }} title={label}>{inner}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
