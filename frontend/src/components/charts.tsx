// Honest SVG visualizations (flame-data-viz & DESIGN_BRIEF).
// Every chart reads precomputed values from public/data/*.json; it never invents statistics or trendlines.
import type { CoverageCell, Fuel, O2Band, Outcome, PressureLevel } from '../data/types';
import { fmtBand, fmtDiameter, fmtRate } from '../lib/format';
import { DISRUPTION_SHORT, isSmallN, outcomeLabel } from '../lib/honesty';

const SHORT_BAND: Record<string, string> = {
  '<0.15': '<15',
  '0.15-0.18': '15–18',
  '0.18-0.21': '18–21',
  '0.21-0.24': '21–24',
  '>=0.24': '≥24',
};

const OUTCOME_COLOR: Record<Outcome, string> = {
  extinction: 'var(--out-extinction)',
  disruption: 'var(--out-disruption)',
  completion: 'var(--out-completion)',
  blowoff: 'var(--out-blowoff)',
  no_ignition: 'var(--out-noflame)',
  not_sustained: 'var(--out-noflame)',
};

// 1. Match Ring SVG (used in "How many tests match this air?" / "Near Moon-base air")
export function MatchRingSvg({
  exact,
  near,
  total = 274,
  minN = 5,
}: {
  exact: number;
  near: number;
  total?: number;
  minN?: number;
}) {
  const r = 25;
  const c = 2 * Math.PI * r;
  const shown = exact > 0 ? exact : near;
  // Scale visually against FLEX tests so 17/274 or 49/274 shows a clear, honest arc
  const ratio = shown === 0 ? 0 : Math.min(1, Math.max(0.12, shown / Math.min(total, 60)));
  const dash = (ratio * c).toFixed(1);
  const small = shown > 0 && isSmallN(shown, minN);
  const stroke = shown === 0 ? 'var(--graphite-5)' : small ? 'var(--caution)' : 'var(--mint)';

  return (
    <svg
      width="62"
      height="62"
      viewBox="0 0 62 62"
      role="img"
      aria-label={`${exact} exact matches and ${near} near matches out of ${total} FLEX tests`}
      style={{ flex: '0 0 62px' }}
    >
      <title>{`${exact} exact matches, ${near} within tolerance`}</title>
      <circle
        cx="31"
        cy="31"
        r={r}
        fill="none"
        stroke="var(--graphite-7)"
        strokeWidth="5"
        strokeDasharray={exact === 0 ? '3 3' : undefined}
      />
      {shown > 0 && (
        <circle
          cx="31"
          cy="31"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeDasharray={`${dash} ${c.toFixed(1)}`}
          strokeLinecap="round"
          transform="rotate(-90 31 31)"
          opacity="0.9"
        />
      )}
      <text
        x="31"
        y="35"
        textAnchor="middle"
        fill="var(--ink)"
        fontSize="12"
        fontWeight="500"
        fontFamily="var(--font-ui)"
      >
        {shown}
      </text>
    </svg>
  );
}

// 2. KPI Fraction Ring (Bottom-right dock: "26/129 BASS-II outcomes stated" & "20/30 FLEX conditions tested")
export function KpiRingSvg({ num, den, label }: { num: number; den: number; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const ratio = den > 0 ? Math.min(1, Math.max(0, num / den)) : 0;
  const dash = (ratio * c).toFixed(1);
  return (
    <div className="kpi-item">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" style={{ flex: '0 0 44px' }}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--graphite-7)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--mint)"
          strokeWidth="4"
          strokeDasharray={`${dash} ${c.toFixed(1)}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div>
        <div className="kpi-val num">
          {num}
          <small>/{den}</small>
        </div>
        <p className="kpi-lbl">{label}</p>
      </div>
    </div>
  );
}

// 3. Burning Rate / Extinction Diameter SVG Chart (supports both 'bars' from reference image and 'line' from v3 reference HTML)
export function BurningRateChartSvg({
  cells,
  bands,
  pressureLevel = '~1.0 atm',
  metric = 'rate',
  mode = 'bars',
  minN = 5,
  compact = false,
}: {
  cells: CoverageCell[];
  bands: { label: O2Band }[];
  pressureLevel?: PressureLevel;
  metric?: 'rate' | 'diameter';
  mode?: 'bars' | 'line';
  minN?: number;
  compact?: boolean;
}) {
  const getPoint = (fuel: Fuel, band: O2Band) => {
    const cell = cells.find((c) => c.fuel === fuel && c.o2_band === band && c.pressure_level === pressureLevel);
    if (!cell) return { val: null, n: 0 };
    const val = metric === 'rate' ? cell.avg_burning_rate_mm2_s : cell.avg_extinction_diameter_mm;
    const n = metric === 'rate' ? cell.n_burning_rate : cell.n_extinction_diameter;
    return { val, n };
  };

  const series = (['heptane', 'methanol'] as Fuel[]).map((fuel) => ({
    fuel,
    color: fuel === 'heptane' ? 'var(--fuel-heptane)' : 'var(--fuel-methanol)',
    points: bands.map((b) => ({ band: b.label, ...getPoint(fuel, b.label) })),
  }));

  const allVals = series.flatMap((s) => s.points.map((p) => p.val)).filter((v): v is number => v != null);
  const smallPointsCount = series.reduce(
    (acc, s) => acc + s.points.filter((p) => p.val != null && isSmallN(p.n, minN)).length,
    0,
  );

  if (allVals.length === 0) {
    return (
      <p className="nodata" style={{ padding: '12px 0' }}>
        No data available for {metric === 'rate' ? 'burning rate' : 'extinction diameter'} at {pressureLevel}.
      </p>
    );
  }

  if (mode === 'bars') {
    const maxVal = Math.max(...allVals, metric === 'rate' ? 0.7 : 3.6);
    const W = compact ? 268 : 520;
    const H = compact ? 98 : 165;
    const padL = compact ? 28 : 42;
    const padR = 8;
    const padT = 14;
    const padB = 22;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const groupW = plotW / bands.length;
    const barW = compact ? 8 : 16;

    const yPos = (v: number) => padT + plotH - (v / maxVal) * plotH;
    const ticks = metric === 'rate' ? [0, 0.35, 0.7] : [0, 1.8, 3.6];

    return (
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label={`Grouped bar chart of ${metric === 'rate' ? 'mean burning rate' : 'mean extinction diameter'} by O₂ band at ${pressureLevel}. ${smallPointsCount} bars have n < ${minN}.`}
          className="lc"
        >
          <title>{`Heptane and methanol ${metric} by O₂ band at ${pressureLevel} (descriptive)`}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={yPos(t)} y2={yPos(t)} stroke="var(--graphite-7)" strokeWidth="1" />
              <text x={padL - 5} y={yPos(t) + 3} textAnchor="end">
                {t.toFixed(1)}
              </text>
            </g>
          ))}
          {bands.map((b, i) => {
            const cx = padL + i * groupW + groupW / 2;
            const hPt = series[0].points[i];
            const mPt = series[1].points[i];
            const pairs = [
              { ...hPt, fuel: 'heptane', color: 'var(--fuel-heptane)', x: cx - barW - 2 },
              { ...mPt, fuel: 'methanol', color: 'var(--fuel-methanol)', x: cx + 2 },
            ];
            return (
              <g key={b.label}>
                {pairs.map((p) => {
                  if (p.val == null) {
                    return (
                      <text key={p.fuel} x={p.x + barW / 2} y={padT + plotH - 4} textAnchor="middle" fill="var(--ink-faint)">
                        ∅
                      </text>
                    );
                  }
                  const bh = Math.max(4, (p.val / maxVal) * plotH);
                  const by = padT + plotH - bh;
                  const small = isSmallN(p.n, minN);
                  return (
                    <g key={p.fuel}>
                      <rect
                        x={p.x}
                        y={by}
                        width={barW}
                        height={bh}
                        rx="2"
                        fill={p.color}
                        fillOpacity={small ? 0.45 : 0.92}
                        stroke={small ? 'var(--caution)' : 'none'}
                        strokeWidth={small ? 1.2 : 0}
                        strokeDasharray={small ? '2 1.5' : undefined}
                      >
                        <title>{`${p.fuel} (${fmtBand(b.label)}): ${
                          metric === 'rate' ? fmtRate(p.val) : fmtDiameter(p.val)
                        } (n = ${p.n}${small ? `, warning: n < ${minN}` : ''})`}</title>
                      </rect>
                      {small && (
                        <text x={p.x + barW / 2} y={by - 3} textAnchor="middle" style={{ fill: 'var(--caution)', fontSize: '8.5px' }}>
                          ⚠{p.n}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={cx} y={H - 5} textAnchor="middle">
                  {SHORT_BAND[b.label] ?? b.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Line chart mode (exact match to flame-v3-reference.html #lc, but 100% driven by coverage.json)
  const minVal = metric === 'rate' ? Math.min(0.3, ...allVals) : Math.min(0.8, ...allVals);
  const maxVal = metric === 'rate' ? Math.max(0.72, ...allVals) : Math.max(3.6, ...allVals);
  const span = Math.max(0.1, maxVal - minVal);
  const W = 330;
  const H = 128;
  const xPos = (i: number) => 38 + i * 66;
  const yPos = (v: number) => 106 - ((v - minVal) / span) * 88;
  const ticks =
    metric === 'rate'
      ? [0.3, 0.5, 0.7]
      : [Number(minVal.toFixed(1)), Number(((minVal + maxVal) / 2).toFixed(1)), Number(maxVal.toFixed(1))];

  // Split polyline segments wherever a band has null data so we NEVER connect across a gap
  const buildSegments = (pts: { val: number | null; n: number }[]) => {
    const segs: { i: number; val: number; n: number }[][] = [];
    let current: { i: number; val: number; n: number }[] = [];
    pts.forEach((p, i) => {
      if (p.val == null) {
        if (current.length > 0) {
          segs.push(current);
          current = [];
        }
      } else {
        current.push({ i, val: p.val, n: p.n });
      }
    });
    if (current.length > 0) segs.push(current);
    return segs;
  };

  return (
    <div className="chart-wrap">
      <svg
        className="lc"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={compact ? 105 : 155}
        role="img"
        aria-label={`Line chart of ${metric === 'rate' ? 'mean burning rate' : 'mean extinction diameter'} by O₂ band at ${pressureLevel}. ${smallPointsCount} points have n < ${minN}.`}
      >
        <title>{`Heptane and methanol ${metric} across O₂ bands at ${pressureLevel} (descriptive)`}</title>
        {ticks.map((v) => (
          <g key={v}>
            <line x1="30" x2="320" y1={yPos(v)} y2={yPos(v)} stroke="var(--graphite-7)" />
            <text x="2" y={yPos(v) + 3}>
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {bands.map((b, i) => (
          <text key={b.label} x={xPos(i)} y="123" textAnchor="middle">
            {SHORT_BAND[b.label] ?? b.label}%
          </text>
        ))}
        {series.map((s) => {
          const segs = buildSegments(s.points);
          return (
            <g key={s.fuel}>
              {segs.map((seg, idx) =>
                seg.length > 1 ? (
                  <polyline
                    key={idx}
                    points={seg.map((pt) => `${xPos(pt.i)},${yPos(pt.val)}`).join(' ')}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="1.7"
                  />
                ) : null,
              )}
              {s.points.map((p, i) => {
                if (p.val == null) return null;
                const small = isSmallN(p.n, minN);
                const cx = xPos(i);
                const cy = yPos(p.val);
                return small ? (
                  <g key={bKey(s.fuel, i)}>
                    <circle cx={cx} cy={cy} r="4.5" fill="var(--graphite-9)" stroke="var(--caution)" strokeWidth="1.6">
                      <title>{`${s.fuel}: ${p.val} (n = ${p.n}, warning: n < ${minN})`}</title>
                    </circle>
                    <text x={cx + (i === 4 ? -28 : 7)} y={cy - 6} style={{ fill: 'var(--caution)' }}>
                      n={p.n}
                    </text>
                  </g>
                ) : (
                  <circle key={bKey(s.fuel, i)} cx={cx} cy={cy} r="3.2" fill={s.color}>
                    <title>{`${s.fuel}: ${p.val} (n = ${p.n})`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const bKey = (fuel: string, i: number) => `${fuel}-${i}`;

// 4. Coverage Radar SVG (5 O₂ bands as sectors × 3 pressure levels as concentric rings)
export function CoverageRadarSvg({
  cells,
  fuel,
  bands,
  pressures,
  minN = 5,
  onSelectCell,
}: {
  cells: CoverageCell[];
  fuel: Fuel;
  bands: { label: O2Band }[];
  pressures: { label: PressureLevel }[];
  minN?: number;
  onSelectCell?: (cell: CoverageCell) => void;
}) {
  const fuelCells = cells.filter((c) => c.fuel === fuel);
  const maxN = Math.max(1, ...fuelCells.map((c) => c.n));
  const cx = 110;
  const cy = 98;
  const rings = [
    { rIn: 16, rOut: 36 }, // ~0.7 atm
    { rIn: 39, rOut: 59 }, // ~1.0 atm
    { rIn: 62, rOut: 80 }, // >2 atm
  ];
  const nBands = bands.length;
  const stepDeg = 360 / nBands;
  const gapDeg = 4;

  const polar = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };

  const sectorPath = (rIn: number, rOut: number, startDeg: number, endDeg: number) => {
    const [x1, y1] = polar(rOut, startDeg);
    const [x2, y2] = polar(rOut, endDeg);
    const [x3, y3] = polar(rIn, endDeg);
    const [x4, y4] = polar(rIn, startDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(
      1,
    )} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
  };

  const fillFor = (n: number) => {
    if (n === 0) return 'rgba(21, 24, 28, 0.55)';
    if (isSmallN(n, minN)) return 'rgba(255, 209, 102, 0.34)';
    const ratio = n / maxN;
    if (ratio < 0.25) return 'var(--cov-1)';
    if (ratio < 0.5) return 'var(--cov-2)';
    if (ratio < 0.75) return 'var(--cov-3)';
    return 'var(--cov-4)';
  };

  return (
    <svg
      width="220"
      height="194"
      viewBox="0 0 220 194"
      role="img"
      aria-label={`Coverage radar for ${fuel}: 5 O₂ bands by 3 pressure rings`}
      style={{ display: 'block', margin: '0 auto' }}
    >
      <title>{`FLEX coverage radar for ${fuel}`}</title>
      {/* Background guide rings */}
      {rings.map((rg, ri) => (
        <circle
          key={ri}
          cx={cx}
          cy={cy}
          r={(rg.rIn + rg.rOut) / 2}
          fill="none"
          stroke="var(--graphite-7)"
          strokeWidth="0.7"
          strokeDasharray="2 3"
        />
      ))}
      {bands.map((b, bi) => {
        const start = bi * stepDeg - stepDeg / 2 + gapDeg / 2;
        const end = (bi + 1) * stepDeg - stepDeg / 2 - gapDeg / 2;
        const [lx, ly] = polar(92, bi * stepDeg);
        return (
          <g key={b.label}>
            {pressures.map((p, pi) => {
              const rg = rings[pi] ?? rings[0];
              const cell = fuelCells.find((c) => c.o2_band === b.label && c.pressure_level === p.label);
              const n = cell?.n ?? 0;
              const small = n > 0 && isSmallN(n, minN);
              return (
                <path
                  key={`${b.label}-${p.label}`}
                  d={sectorPath(rg.rIn, rg.rOut, start, end)}
                  fill={fillFor(n)}
                  stroke={
                    n === 0
                      ? 'rgba(91, 99, 109, 0.35)'
                      : small
                        ? 'var(--caution)'
                        : 'rgba(127, 245, 225, 0.48)'
                  }
                  strokeWidth={small ? '1.3' : '0.9'}
                  strokeDasharray={n === 0 ? '2 2' : undefined}
                  style={{ cursor: onSelectCell && cell ? 'pointer' : 'default' }}
                  onClick={() => cell && onSelectCell?.(cell)}
                >
                  <title>{`${fuel} · ${fmtBand(b.label)} · ${p.label}: ${
                    n === 0 ? 'No data' : `n = ${n}${small ? ` (warning: n < ${minN})` : ''}`
                  }`}</title>
                </path>
              );
            })}
            <text
              x={lx.toFixed(1)}
              y={(ly + 3).toFixed(1)}
              textAnchor="middle"
              fill="var(--ink-dim)"
              fontSize="9.5"
              fontFamily="var(--font-mono)"
            >
              {SHORT_BAND[b.label] ?? b.label}
              {bi === 0 || bi === 4 ? '%' : ''}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="6" fill="var(--graphite-9)" stroke="var(--silver)" strokeOpacity="0.6" />
    </svg>
  );
}

// 5. Outcome Pills & Horizontal Bars (used in Scenario Inspector and Scenario Explorer)
export function OutcomePills({
  outcomes,
  includeZeroExtinction = true,
}: {
  outcomes?: Partial<Record<Outcome, number>>;
  includeZeroExtinction?: boolean;
}) {
  const entries = Object.entries(outcomes ?? {}) as [Outcome, number][];
  if (entries.length === 0) return null;
  const hasExt = entries.some(([k]) => k === 'extinction');
  const all: [Outcome, number][] =
    includeZeroExtinction && !hasExt ? [...entries, ['extinction', 0]] : entries;

  return (
    <div className="outs" aria-label="Observed outcomes">
      {all.map(([o, n]) => (
        <span
          key={o}
          className={`out-pill o-${o}`}
          title={o === 'disruption' ? `Disruption: ${DISRUPTION_SHORT}` : undefined}
        >
          {o.replace('_', ' ')} <b className="num">{n}</b>
        </span>
      ))}
    </div>
  );
}

export function OutcomeBarsSvg({
  outcomes,
  total,
  minN = 5,
}: {
  outcomes?: Partial<Record<Outcome, number>>;
  total: number;
  minN?: number;
}) {
  const entries = Object.entries(outcomes ?? {}) as [Outcome, number][];
  if (entries.length === 0 || total === 0) return null;
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="outcome-bars" role="img" aria-label={`Outcome breakdown for n = ${total} tests`}>
      {entries.map(([o, n]) => {
        const small = n > 0 && isSmallN(n, minN);
        const pctWidth = Math.max(6, Math.round((n / max) * 100));
        return (
          <div key={o} className="ob-row">
            <span className="ob-lbl">
              {outcomeLabel(o)}
              {o === 'disruption' && <small className="dim"> ({DISRUPTION_SHORT})</small>}
            </span>
            <div className="ob-track" aria-hidden="true">
              <div
                className={`ob-fill${small ? ' ob-small' : ''}`}
                style={{
                  width: `${pctWidth}%`,
                  background: small ? 'var(--caution)' : OUTCOME_COLOR[o] ?? 'var(--mint)',
                }}
              />
            </div>
            <span className="ob-n num">
              n = {n} {small && <span style={{ color: 'var(--caution)' }}>⚠</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 6. BASS-II Count Bar (Materials section — strictly NO "%" symbol anywhere in DOM text!)
export function Bass2CountBar({
  n,
  nWithOutcome,
  nNotStated,
  maxN = 56,
}: {
  n: number;
  nWithOutcome: number;
  nNotStated: number;
  maxN?: number;
}) {
  const wStated = Math.round((nWithOutcome / Math.max(1, maxN)) * 180);
  const wUnstated = Math.round((nNotStated / Math.max(1, maxN)) * 180);
  return (
    <div className="bass-bar-wrap" aria-hidden="true">
      <svg width="100%" height="14" viewBox="0 0 190 14" preserveAspectRatio="none">
        <rect x="0" y="2" width="186" height="10" rx="3" fill="var(--graphite-8)" />
        {wStated > 0 && (
          <rect x="2" y="3" width={Math.max(4, wStated)} height="8" rx="2" fill="var(--prog-bass2)" />
        )}
        {wUnstated > 0 && (
          <rect
            x={2 + wStated + (wStated > 0 ? 2 : 0)}
            y="3"
            width={Math.max(4, wUnstated)}
            height="8"
            rx="2"
            fill="none"
            stroke="var(--ink-dim)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}
      </svg>
      <div className="bass-bar-legend num">
        <span>
          <i className="dot-stated" /> {nWithOutcome} stated
        </span>
        <span>
          <i className="dot-unstated" /> {nNotStated} not stated (of {n})
        </span>
      </div>
    </div>
  );
}
