// Charts built from the 403-row experiments.json and coverage.json. The browser only counts and places marks:
// no fitted line, no averages, no probabilities. Every mark is a real test or a real count.
import { memo, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { CoverageCell, ExperimentRow, Meta, Outcome } from '../data/types';
import { DISRUPTION_SHORT, isSmallN, outcomeLabel } from '../lib/honesty';
import { suppressantOf } from '../lib/filters';
import { fmtBand } from '../lib/format';

export type ColorBy = 'fuel' | 'outcome';

const FUEL_COLOR: Record<string, string> = { heptane: 'var(--fuel-heptane)', methanol: 'var(--fuel-methanol)' };
const OUTCOME_COLOR: Partial<Record<Outcome, string>> = {
  extinction: 'var(--out-extinction)', disruption: 'var(--out-disruption)', completion: 'var(--out-completion)',
  blowoff: 'var(--out-blowoff)', no_ignition: 'var(--out-noflame)', not_sustained: 'var(--out-noflame)',
};
const OUTCOME_ORDER: Outcome[] = ['extinction', 'disruption', 'completion', 'blowoff', 'no_ignition', 'not_sustained'];
const colorOf = (r: ExperimentRow, by: ColorBy) =>
  by === 'fuel' ? FUEL_COLOR[r.material_or_fuel] ?? 'var(--ink-dim)' : (r.outcome && OUTCOME_COLOR[r.outcome]) || 'var(--ink-dim)';

export const flexWithRate = (rows: ExperimentRow[]) => rows.filter((r) => r.program === 'FLEX' && r.burning_rate_mm2_s != null);

export function ScatterKey({ by }: { by: ColorBy }) {
  const items = by === 'fuel'
    ? [['Heptane', FUEL_COLOR.heptane], ['Methanol', FUEL_COLOR.methanol]]
    : [['Extinction', OUTCOME_COLOR.extinction!], ['Disruption', OUTCOME_COLOR.disruption!], ['Completion', OUTCOME_COLOR.completion!]];
  return (
    <div className="chart-key">
      {items.map(([l, c]) => <span key={l}><b style={{ background: c }} /> {l}</span>)}
    </div>
  );
}

// ---------- scatter: one dot = one real FLEX test ----------
// The tooltip is moved by hand (no React state), so hovering 258 dots never re-renders the chart.
export const TestsScatterSvg = memo(function TestsScatterSvg({ rows, by, w = 330, h = 150 }: { rows: ExperimentRow[]; by: ColorBy; w?: number; h?: number }) {
  const pts = useMemo(() => flexWithRate(rows), [rows]);
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  if (pts.length === 0) return <p className="nodata">No data: no test has a recorded burning rate.</p>;
  const padL = 34, padR = 8, padT = 8, padB = 24;
  const xMin = 10, xMax = 36, yMax = 1.1;
  const x = (o2: number) => padL + ((o2 * 100 - xMin) / (xMax - xMin)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - v / yMax) * (h - padT - padB);

  const onOver = (e: PointerEvent<HTMLDivElement>) => {
    const t = (e.target as Element).closest('circle[data-tip]');
    const el = tip.current;
    const box = wrap.current?.getBoundingClientRect();
    if (!el || !box) return;
    if (!t) { el.classList.remove('on'); return; }
    el.textContent = t.getAttribute('data-tip');
    el.style.left = `${e.clientX - box.left}px`;
    el.style.top = `${e.clientY - box.top}px`;
    el.classList.add('on');
  };

  return (
    <div className="dchart-wrap" ref={wrap} onPointerMove={onOver} onPointerLeave={() => tip.current?.classList.remove('on')}>
      <svg className="dchart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Scatter of ${pts.length} FLEX tests: oxygen percent against burning rate, one dot per test`}>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="var(--graphite-7)" />
            <text x={padL - 5} y={y(v) + 3} textAnchor="end" className="ax">{v.toFixed(1)}</text>
          </g>
        ))}
        {[15, 21, 30].map((v) => (
          <g key={v}>
            <line x1={x(v / 100)} x2={x(v / 100)} y1={padT} y2={h - padB} stroke="var(--graphite-7)" strokeDasharray="2 4" />
            <text x={x(v / 100)} y={h - 9} textAnchor="middle" className="ax">{v}%</text>
          </g>
        ))}
        <text x={w - padR} y={h - 1} textAnchor="end" className="ax">O₂ at test →</text>
        <text x={padL + 6} y={padT + 8} className="ax">↑ burning rate, mm²/s</text>
        {pts.map((r, i) => (
          <circle key={`${r.test_id}-${i}`} cx={x(r.o2_fraction)} cy={y(r.burning_rate_mm2_s as number)} r={w > 500 ? 3.2 : 2.4}
            fill={colorOf(r, by)} fillOpacity="0.78" className="dot"
            data-tip={`${r.test_id} · ${r.material_or_fuel} · O₂ ${(r.o2_fraction * 100).toFixed(1)}% · ${r.burning_rate_mm2_s} mm²/s`}
            style={{ animationDelay: `${Math.round(((r.o2_fraction * 100 - xMin) / (xMax - xMin)) * 520)}ms` }} />
        ))}
      </svg>
      <div className="ctip" ref={tip} role="presentation" />
    </div>
  );
});

// ---------- donut (pie): slice size = number of tests; the centre shows a count, never a probability ----------
export interface Slice { key: string; label: string; value: number; color: string }

export const DonutChart = memo(function DonutChart({ slices, total, unit = 'tests' }: { slices: Slice[]; total: number; unit?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const live = slices.filter((s) => s.value > 0);
  const sum = live.reduce((a, s) => a + s.value, 0);
  if (sum === 0) return <p className="nodata">No data</p>;
  const active = live.find((s) => s.key === hover);
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${live.map((s) => `${s.label} ${s.value}`).join(', ')}; n = ${total}`}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--graphite-8)" strokeWidth="13" />
        <g transform="rotate(-90 50 50)">
          {live.map((s, i) => {
            const len = (s.value / sum) * 100;
            const seg = Math.max(len - 0.9, 0.3); // a hair of gap between slices
            const off = -acc;
            acc += len;
            return (
              <circle key={s.key} cx="50" cy="50" r="40" fill="none" stroke={s.color} pathLength={100}
                strokeWidth={hover === s.key ? 16 : 13} strokeDasharray={`${seg} ${100 - seg}`} strokeDashoffset={off}
                className="donut-seg" style={{ animationDelay: `${i * 110}ms`, opacity: hover && hover !== s.key ? 0.3 : 1 }}
                onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)} />
            );
          })}
        </g>
        <text x="50" y="49" textAnchor="middle" className="donut-n">{active ? active.value : total}</text>
        <text x="50" y="60" textAnchor="middle" className="donut-l">{active ? active.label : unit}</text>
      </svg>
      <ul className="donut-legend">
        {live.map((s) => (
          <li key={s.key} className={hover === s.key ? 'on' : undefined} onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)}>
            <i style={{ background: s.color }} /><span>{s.label}</span><b className="num">{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const outcomeSlices = (outcomes?: Partial<Record<Outcome, number>>): Slice[] =>
  OUTCOME_ORDER.filter((o) => (outcomes?.[o] ?? 0) > 0).map((o) => ({
    key: o, label: outcomeLabel(o), value: outcomes?.[o] ?? 0, color: OUTCOME_COLOR[o] ?? 'var(--ink-dim)',
  }));

export const OutcomesDonut = memo(function OutcomesDonut({ outcomes, total }: { outcomes?: Partial<Record<Outcome, number>>; total: number }) {
  return <DonutChart slices={outcomeSlices(outcomes)} total={total} />;
});

const mixSlices = (rows: ExperimentRow[]): Slice[] => {
  const n = (f: (r: ExperimentRow) => boolean) => rows.filter(f).length;
  return [
    { key: 'h', label: 'FLEX · heptane', value: n((r) => r.program === 'FLEX' && r.material_or_fuel === 'heptane'), color: FUEL_COLOR.heptane },
    { key: 'm', label: 'FLEX · methanol', value: n((r) => r.program === 'FLEX' && r.material_or_fuel === 'methanol'), color: FUEL_COLOR.methanol },
    { key: 'b', label: 'BASS-II · solids', value: n((r) => r.program === 'BASS-II'), color: 'var(--prog-bass2)' },
  ];
};

export const TestsMixDonut = memo(function TestsMixDonut({ rows }: { rows: ExperimentRow[] }) {
  const slices = useMemo(() => mixSlices(rows), [rows]);
  return <DonutChart slices={slices} total={rows.length} />;
});

// FLEX tests by the suppressant gas that was added (BASS-II has none, so it is left out).
export const SuppressantDonut = memo(function SuppressantDonut({ rows }: { rows: ExperimentRow[] }) {
  const { slices, total } = useMemo(() => {
    const c = { none: 0, co2: 0, he: 0 };
    for (const r of rows) { const s = suppressantOf(r); if (s) c[s] += 1; }
    return {
      total: c.none + c.co2 + c.he,
      slices: [
        { key: 'none', label: 'None added', value: c.none, color: 'var(--silver)' },
        { key: 'co2', label: 'CO₂ added', value: c.co2, color: 'var(--seq-3)' },
        { key: 'he', label: 'He added', value: c.he, color: 'var(--seq-4)' },
      ] as Slice[],
    };
  }, [rows]);
  return <DonutChart slices={slices} total={total} unit="FLEX tests" />;
});

// ---------- bars ----------
export const TestsMixBars = memo(function TestsMixBars({ rows }: { rows: ExperimentRow[] }) {
  const items = useMemo(() => mixSlices(rows), [rows]);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="outcome-bars" role="img" aria-label={`Tests by program and fuel, total ${rows.length}`}>
      {items.map((i, k) => (
        <div key={i.key} className="ob-row">
          <span className="ob-lbl">{i.label}</span>
          <div className="ob-track" aria-hidden="true"><div className="ob-fill" style={{ width: `${Math.max(4, Math.round((i.value / max) * 100))}%`, background: i.color, animationDelay: `${k * 90}ms` }} /></div>
          <span className="ob-n num">n = {i.value}</span>
        </div>
      ))}
    </div>
  );
});

// How FLEX tests ended, per fuel, as counts (stacked segments).
export const OutcomesByFuelSvg = memo(function OutcomesByFuelSvg({ rows }: { rows: ExperimentRow[] }) {
  const data = useMemo(() => {
    const flex = rows.filter((r) => r.program === 'FLEX' && r.outcome != null);
    return ['heptane', 'methanol'].map((fuel) => {
      const mine = flex.filter((r) => r.material_or_fuel === fuel);
      const by: Partial<Record<Outcome, number>> = {};
      for (const r of mine) by[r.outcome as Outcome] = (by[r.outcome as Outcome] ?? 0) + 1;
      return { fuel, total: mine.length, by };
    });
  }, [rows]);
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chart-key">
        {OUTCOME_ORDER.filter((o) => data.some((d) => d.by[o])).map((o) => (
          <span key={o}><b style={{ background: OUTCOME_COLOR[o] }} /> {outcomeLabel(o)}{o === 'disruption' ? ` (${DISRUPTION_SHORT})` : ''}</span>
        ))}
      </div>
      {data.map((d) => (
        <div key={d.fuel} className="stack-row" role="img"
          aria-label={`${d.fuel}: ${OUTCOME_ORDER.filter((o) => d.by[o]).map((o) => `${outcomeLabel(o)} ${d.by[o]}`).join(', ')}; n = ${d.total}`}>
          <span className="ob-lbl" style={{ textTransform: 'capitalize' }}>{d.fuel}</span>
          <div className="stack-track" aria-hidden="true" style={{ width: `${Math.max(8, (d.total / max) * 100)}%` }}>
            {OUTCOME_ORDER.filter((o) => d.by[o]).map((o) => (
              <i key={o} style={{ flexGrow: d.by[o], background: OUTCOME_COLOR[o] }} title={`${outcomeLabel(o)}: ${d.by[o]}`}><span className="num">{d.by[o]}</span></i>
            ))}
          </div>
          <span className="ob-n num">n = {d.total}</span>
        </div>
      ))}
    </div>
  );
});

// Number of FLEX tests in each oxygen band, one bar per fuel. n < min_n is outlined and marked ⚠.
export const O2BandBars = memo(function O2BandBars({ rows, bands, minN, w = 330, h = 150 }: { rows: ExperimentRow[]; bands: Meta['o2_bands']; minN: number; w?: number; h?: number }) {
  const data = useMemo(() => bands.map((b) => {
    const inBand = rows.filter((r) => r.program === 'FLEX' && r.o2_fraction >= b.min_inclusive && r.o2_fraction < b.max_exclusive);
    return { label: b.label, heptane: inBand.filter((r) => r.material_or_fuel === 'heptane').length, methanol: inBand.filter((r) => r.material_or_fuel === 'methanol').length };
  }), [rows, bands]);
  const max = Math.max(1, ...data.flatMap((d) => [d.heptane, d.methanol]));
  const padL = 24, padB = 22, padT = 14;
  const slot = (w - padL - 6) / data.length;
  const bw = Math.min(26, slot / 2 - 4);
  const yv = (n: number) => padT + (1 - n / max) * (h - padT - padB);
  return (
    <svg className="dchart" viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label={`FLEX tests per oxygen band: ${data.map((d) => `${fmtBand(d.label)} heptane ${d.heptane}, methanol ${d.methanol}`).join('; ')}`}>
      {[0, Math.round(max / 2), max].map((v) => (
        <g key={v}>
          <line x1={padL} x2={w - 6} y1={yv(v)} y2={yv(v)} stroke="var(--graphite-7)" />
          <text x={padL - 4} y={yv(v) + 3} textAnchor="end" className="ax">{v}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        return (
          <g key={d.label}>
            {([['heptane', d.heptane, -bw - 1], ['methanol', d.methanol, 1]] as const).map(([fuel, n, dx], k) => {
              const small = n > 0 && isSmallN(n, minN);
              return (
                <g key={fuel}>
                  <rect x={cx + dx} y={yv(n)} width={bw} height={Math.max(0, h - padB - yv(n))} rx="2" className="vbar"
                    fill={FUEL_COLOR[fuel]} fillOpacity={small ? 0.25 : 0.9} stroke={small ? 'var(--caution)' : 'none'} strokeDasharray={small ? '2 2' : undefined}
                    style={{ animationDelay: `${i * 70 + k * 40}ms` }}>
                    <title>{`${fuel} · ${fmtBand(d.label)} · n = ${n}${small ? ` (n < ${minN})` : ''}`}</title>
                  </rect>
                  <text x={cx + dx + bw / 2} y={yv(n) - 3} textAnchor="middle" className="ax" style={small ? { fill: 'var(--caution)' } : undefined}>{n}{small ? '⚠' : ''}</text>
                </g>
              );
            })}
            <text x={cx} y={h - 8} textAnchor="middle" className="ax">{fmtBand(d.label).replace(' O₂', '')}</text>
          </g>
        );
      })}
    </svg>
  );
});

// FLEX tests per pressure level, stacked by fuel (counts from coverage.json cells, which already apply the exclusions).
export const PressureBars = memo(function PressureBars({ cells, levels }: { cells: CoverageCell[]; levels: Meta['pressure_levels'] }) {
  const data = useMemo(() => levels.map((l) => {
    const mine = cells.filter((c) => c.pressure_level === l.label);
    const sum = (f: string) => mine.filter((c) => c.fuel === f).reduce((a, c) => a + c.n, 0);
    return { label: l.label, heptane: sum('heptane'), methanol: sum('methanol') };
  }), [cells, levels]);
  const max = Math.max(1, ...data.map((d) => d.heptane + d.methanol));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chart-key">
        <span><b style={{ background: FUEL_COLOR.heptane }} /> Heptane</span>
        <span><b style={{ background: FUEL_COLOR.methanol }} /> Methanol</span>
      </div>
      {data.map((d) => (
        <div key={d.label} className="stack-row" role="img" aria-label={`${d.label}: heptane ${d.heptane}, methanol ${d.methanol}`}>
          <span className="ob-lbl">{d.label}</span>
          <div className="stack-track" aria-hidden="true" style={{ width: `${Math.max(8, ((d.heptane + d.methanol) / max) * 100)}%` }}>
            {d.heptane > 0 && <i style={{ flexGrow: d.heptane, background: FUEL_COLOR.heptane }}><span className="num">{d.heptane}</span></i>}
            {d.methanol > 0 && <i style={{ flexGrow: d.methanol, background: FUEL_COLOR.methanol }}><span className="num">{d.methanol}</span></i>}
          </div>
          <span className="ob-n num">n = {d.heptane + d.methanol}</span>
        </div>
      ))}
    </div>
  );
});
