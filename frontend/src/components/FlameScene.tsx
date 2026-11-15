// 2.5D Microgravity Combustion Chamber Scene (flame-v3-reference.html + reference image), fixed camera.
// Driven by the active atmosphere scenario from scenarios.json (O₂ fraction scales flame radius & brightness).
// No drag-to-rotate and no wheel zoom: the page keeps scrolling over the scene. The static artwork is memoized and
// has no SVG filters, so changing a card never forces the whole scene to repaint.
import { memo, useEffect, useRef, useState } from 'react';
import type { Scenario } from '../data/types';
import type { ExplanationMode } from '../state/ui';
import { fmtCriterionO2, fmtCriterionP } from '../lib/scenario';
import type { FlameState } from '../lib/explorer';

// Custom explorer ("observed" mode): the flame is driven only by matched FLEX tests (lib/explorer.ts).
// glow = observed mean burning rate on the fixed GLOBAL FLEX scale (0–1, never rescaled per selection).
export interface ObservedFlame { state: FlameState; glow: number | null; k: number; n: number; atmosphere: string; caption: string }
const obsScale = (glow: number | null) => (glow == null ? 1 : Number((0.8 + 0.6 * glow).toFixed(3)));

export type ZoomLevel = 1 | 2 | 3; // 1 = Chamber, 2 = Flame, 3 = Droplet

const SCALE_FOR_LEVEL: Record<ZoomLevel, number> = { 1: 1, 2: 1.85, 3: 2.9 };
const INITIAL_WORLD = 'translate(0 0) translate(800 480) scale(1) translate(-800 -480)';


// Deterministic multi-depth starfield with parallax drift + 5 twinkle frequencies.
const STAR_LAYERS: { driftCls: string; groups: { cls: string; stars: [number, number, number, string?][] }[] }[] = [
  {
    driftCls: 'star-drift-1',
    groups: [
      {
        cls: 'star-layer star-t1',
        stars: [
          [88, 74, 1.9, '#F2F6FF'], [246, 142, 1.5], [392, 68, 2.2, '#D3DDFF'], [520, 118, 1.4],
          [684, 58, 1.8], [934, 64, 2.1, '#7FF5E1'], [1142, 92, 1.6], [1318, 72, 2.3, '#D3DDFF'],
          [1488, 128, 1.5], [134, 312, 1.8], [358, 284, 1.4], [1238, 266, 2.0, '#F2F6FF'],
          [1464, 342, 1.6], [96, 560, 2.1, '#D3DDFF'], [342, 590, 1.5], [1258, 574, 1.8],
          [1512, 610, 2.2, '#7FF5E1'], [184, 812, 1.6], [448, 846, 1.9], [1166, 834, 1.8, '#D3DDFF'],
          [1426, 820, 1.5],
        ],
      },
      {
        cls: 'star-layer star-t4',
        stars: [
          [148, 112, 2.0, '#FFF4D6'], [438, 148, 1.6, '#7FF5E1'], [598, 96, 1.9, '#D3DDFF'],
          [1048, 88, 2.1, '#F2F6FF'], [1392, 108, 1.7, '#7FF5E1'], [288, 344, 2.0, '#D3DDFF'],
          [492, 318, 1.5], [1118, 312, 1.8, '#FFF4D6'], [1338, 302, 2.2, '#7FF5E1'],
          [206, 488, 1.7], [1402, 476, 1.9, '#D3DDFF'], [294, 682, 2.1, '#F2F6FF'],
          [1224, 696, 1.7, '#7FF5E1'],
        ],
      },
    ],
  },
  {
    driftCls: 'star-drift-2',
    groups: [
      {
        cls: 'star-layer star-t2',
        stars: [
          [164, 196, 1.7], [312, 218, 2.3, '#7FF5E1'], [468, 182, 1.3], [1086, 168, 1.9, '#D3DDFF'],
          [1264, 188, 1.4], [1412, 224, 2.1], [72, 424, 1.6], [274, 446, 2.0, '#F2F6FF'],
          [432, 398, 1.4], [1178, 412, 1.7], [1354, 448, 2.3, '#D3DDFF'], [1534, 468, 1.5],
          [142, 694, 1.9], [318, 728, 1.6, '#7FF5E1'], [486, 742, 1.8], [1124, 736, 1.5],
          [1308, 712, 2.2, '#F2F6FF'], [1492, 748, 1.7], [624, 868, 1.8], [984, 876, 2.0, '#D3DDFF'],
        ],
      },
      {
        cls: 'star-layer star-t5',
        stars: [
          [64, 254, 1.9, '#7FF5E1'], [228, 262, 1.5], [534, 218, 2.1, '#D3DDFF'],
          [1054, 232, 1.8, '#FFF4D6'], [1478, 272, 2.2, '#7FF5E1'], [118, 504, 1.6],
          [382, 534, 2.0, '#F2F6FF'], [1206, 518, 1.9, '#D3DDFF'], [1452, 548, 1.6],
          [82, 764, 2.1, '#7FF5E1'], [528, 796, 1.7], [1072, 792, 2.0, '#D3DDFF'],
          [1368, 782, 1.8, '#FFF4D6'],
        ],
      },
    ],
  },
  {
    driftCls: 'star-drift-3',
    groups: [
      {
        cls: 'star-layer star-t3',
        stars: [
          [54, 148, 1.5], [218, 88, 2.2, '#D3DDFF'], [612, 134, 1.7], [768, 82, 2.0, '#F2F6FF'],
          [856, 112, 1.5], [1018, 124, 2.4, '#7FF5E1'], [1376, 138, 1.6], [1548, 84, 1.9],
          [212, 368, 2.2, '#D3DDFF'], [386, 492, 1.7], [1214, 344, 2.0], [1396, 536, 1.6, '#F2F6FF'],
          [238, 636, 1.5], [412, 668, 2.2, '#D3DDFF'], [1192, 658, 1.7], [1382, 642, 2.1, '#7FF5E1'],
          [78, 856, 1.8], [356, 862, 1.6], [742, 858, 2.1, '#F2F6FF'], [1284, 854, 1.7],
          [1528, 858, 2.0, '#D3DDFF'],
        ],
      },
    ],
  },
];

// Four-point bright beacon stars that visibly pulse and shimmer across deep space
const SPARKLE_STARS: [number, number, number, string, string][] = [
  [312, 218, 8.5, '#7FF5E1', 'star-t2'],
  [1318, 72, 9, '#D3DDFF', 'star-t1'],
  [1018, 124, 8, '#7FF5E1', 'star-t3'],
  [212, 368, 8.5, '#F2F6FF', 'star-t4'],
  [1354, 448, 9, '#D3DDFF', 'star-t2'],
  [1512, 610, 8, '#7FF5E1', 'star-t5'],
  [412, 668, 8.5, '#D3DDFF', 'star-t3'],
  [1308, 712, 8.5, '#F2F6FF', 'star-t1'],
  [148, 112, 7.5, '#FFF4D6', 'star-t4'],
  [534, 218, 7.5, '#7FF5E1', 'star-t5'],
  [1086, 168, 8, '#D3DDFF', 'star-t2'],
  [96, 560, 8, '#7FF5E1', 'star-t1'],
  [1238, 266, 7.5, '#F2F6FF', 'star-t3'],
  [1382, 642, 8, '#7FF5E1', 'star-t4'],
];

// Static background, bezel and reticle: depends on nothing, so it renders once.
const Backdrop = memo(function Backdrop() {
  return (
    <>
      <defs>
        <radialGradient id="bgglow" cx="50%" cy="48%" r="55%">
          <stop offset="0" stopColor="#18213a" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#0a0d14" stopOpacity="0.9" />
          <stop offset="1" stopColor="#040506" />
        </radialGradient>
        <radialGradient id="flameGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#F7F9FF" />
          <stop offset="0.22" stopColor="#D3DDFF" />
          <stop offset="0.45" stopColor="#7C96FF" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#3E56C8" stopOpacity="0.38" />
          <stop offset="1" stopColor="#26324F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flameGradGrey" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#E6EAF0" />
          <stop offset="0.4" stopColor="#8E96A0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#3A4048" stopOpacity="0" />
        </radialGradient>
        <pattern id="hatchPat" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#5B636D" strokeWidth="2" strokeOpacity="0.55" />
        </pattern>
        <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#6F8CFF" stopOpacity="0.32" />
          <stop offset="1" stopColor="#6F8CFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2B3036" />
          <stop offset="0.45" stopColor="#14171B" />
          <stop offset="1" stopColor="#08090B" />
        </linearGradient>
        <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E6EAF0" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#8E96A0" stopOpacity="0.25" />
          <stop offset="1" stopColor="#C7CDD4" stopOpacity="0.05" />
        </linearGradient>
        <pattern id="starsPat" width="220" height="220" patternUnits="userSpaceOnUse">
          <circle cx="18" cy="28" r="0.85" fill="#fff" opacity="0.28" />
          <circle cx="114" cy="74" r="0.7" fill="#fff" opacity="0.22" />
          <circle cx="182" cy="164" r="0.9" fill="#fff" opacity="0.26" />
          <circle cx="64" cy="148" r="0.65" fill="#fff" opacity="0.2" />
        </pattern>
        <linearGradient id="meteorGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7FF5E1" stopOpacity="0" />
          <stop offset="0.7" stopColor="#D3DDFF" stopOpacity="0.65" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#bgglow)" />
      <rect width="1600" height="1000" fill="url(#starsPat)" className="star-drift-bg" />
      {STAR_LAYERS.map((drift) => (
        <g key={drift.driftCls} className={drift.driftCls}>
          {drift.groups.map((group) => (
            <g key={group.cls} className={group.cls}>
              {group.stars.map(([cx, cy, r, fill], idx) => (
                <g key={idx}>
                  {r >= 1.9 && (
                    <circle cx={cx} cy={cy} r={r * 2.6} fill={fill ?? '#D3DDFF'} opacity="0.2" />
                  )}
                  <circle cx={cx} cy={cy} r={r} fill={fill ?? '#FFFFFF'} />
                </g>
              ))}
            </g>
          ))}
        </g>
      ))}
      <g className="star-sparkles star-drift-2" strokeWidth="1.15" strokeLinecap="round">
        {SPARKLE_STARS.map(([cx, cy, arm, color, cls], idx) => (
          <g key={idx} className={`star-layer ${cls}`} stroke={color}>
            <circle cx={cx} cy={cy} r="2.2" fill={color} stroke="none" opacity="0.85" />
            <line x1={cx - arm} y1={cy} x2={cx + arm} y2={cy} />
            <line x1={cx} y1={cy - arm} x2={cx} y2={cy + arm} />
          </g>
        ))}
      </g>
      <g className="shooting-stars" aria-hidden="true">
        <line x1="210" y1="88" x2="305" y2="122" stroke="url(#meteorGrad)" strokeWidth="1.6" strokeLinecap="round" className="shooting-star shooting-star-1" />
        <line x1="1180" y1="138" x2="1285" y2="176" stroke="url(#meteorGrad)" strokeWidth="1.5" strokeLinecap="round" className="shooting-star shooting-star-2" />
      </g>
      <g stroke="#5B636D" strokeWidth="1" opacity="0.45">
        <path d="M 552 228 h 8 M 556 224 v 8" />
        <path d="M 1044 228 h 8 M 1048 224 v 8" />
        <path d="M 508 660 h 8 M 512 656 v 8" />
        <path d="M 1084 660 h 8 M 1088 656 v 8" />
      </g>
    </>
  );
});

// k of N segments around the flame (one per matched test; continuous arcs if N > 120).
function OutcomeRing({ k, n }: { k: number; n: number }) {
  const r = 150, cx = 800, cy = 480;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => `${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)}`;
    return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
  };
  if (n > 120) {
    const a = (2 * Math.PI * k) / n;
    return (
      <g className="obs-ring" fill="none" strokeWidth="5">
        <circle cx={cx} cy={cy} r={r} stroke="#3A4048" />
        {k > 0 && <path d={k === n ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}` : arc(0, a)} stroke="#7FF5E1" />}
      </g>
    );
  }
  const step = (2 * Math.PI) / n, gap = Math.min(step * 0.25, 0.04);
  return (
    <g className="obs-ring" fill="none" strokeWidth="5" strokeLinecap="butt">
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={arc(i * step + gap / 2, (i + 1) * step - gap / 2)} stroke={i < k ? '#7FF5E1' : '#3A4048'} />
      ))}
    </g>
  );
}

const Chamber = memo(function Chamber({ flameScale, rimOpacity, showRuler, obs }: { flameScale: number; rimOpacity: number; showRuler: boolean; obs?: ObservedFlame }) {
  return (
    <>
      <circle cx="800" cy="480" r="330" fill="url(#metalGrad)" />
      <circle cx="800" cy="480" r="330" fill="none" stroke="url(#rimGrad)" strokeWidth="2.5" />
      <g fill="#0a0c0f" stroke="#3A4048" strokeWidth="1.2">
        <circle cx="800" cy="168" r="7" />
        <circle cx="800" cy="792" r="7" />
        <circle cx="488" cy="480" r="7" />
        <circle cx="1112" cy="480" r="7" />
        <circle cx="580" cy="260" r="6" />
        <circle cx="1020" cy="260" r="6" />
        <circle cx="580" cy="700" r="6" />
        <circle cx="1020" cy="700" r="6" />
      </g>
      <circle cx="800" cy="480" r="280" fill="#05070a" stroke="#3A4048" strokeWidth="1.5" />
      <circle cx="800" cy="480" r="272" fill="none" stroke="url(#rimGrad)" strokeWidth="1" />
      <g stroke="#5B636D" strokeOpacity="0.55" fill="none">
        <circle cx="800" cy="480" r="235" strokeDasharray="2 8" />
        <circle cx="800" cy="480" r="180" strokeOpacity="0.3" />
        <line x1="800" y1="215" x2="800" y2="250" />
        <line x1="800" y1="710" x2="800" y2="745" />
        <line x1="535" y1="480" x2="570" y2="480" />
        <line x1="1030" y1="480" x2="1065" y2="480" />
      </g>
      <circle cx="800" cy="480" r="252" fill="none" stroke="#C7CDD4" strokeOpacity="0.18" strokeDasharray="60 18 4 18" />

      {/* Quartz tether fiber + fuel droplet + spherical flame (the gradient is already soft: no blur filter) */}
      <line x1="800" y1="480" x2="800" y2="760" stroke="#8E96A0" strokeOpacity="0.55" strokeWidth="1.2" />
      {obs?.state === 'empty' ? (
        <g className="obs-empty" data-obs-state="empty">
          <circle cx="800" cy="480" r="150" fill="url(#hatchPat)" stroke="#5B636D" strokeDasharray="6 6" />
          <text x="800" y="424" textAnchor="middle" fill="#C7CDD4" fontSize="15" fontFamily="var(--font-mono)">No test within tolerance</text>
          <text x="800" y="446" textAnchor="middle" fill="#8E96A0" fontSize="12" fontFamily="var(--font-mono)">of these settings</text>
        </g>
      ) : (
        <g style={{ transformOrigin: '800px 480px', transform: `scale(${flameScale})`, transition: 'transform 0.6s var(--ease-out)' }}
          className={obs ? `obs-flame obs-${obs.state}` : undefined} data-obs-state={obs?.state} data-obs-scale={obs ? flameScale : undefined}>
          <circle className="flame-ring" cx="800" cy="480" r="118" fill="none" stroke="#D3DDFF" strokeWidth="2" />
          <g className={!obs || obs.state === 'stable' ? 'flame-breath' : obs.state === 'mixed' ? 'obs-flicker' : undefined}>
            <circle cx="800" cy="480" r="200" fill="url(#haloGrad)" />
            <circle cx="800" cy="480" r="118" fill={obs?.state === 'small_n' ? 'url(#flameGradGrey)' : 'url(#flameGrad)'} />
            <circle cx="800" cy="480" r="74" fill="none" stroke="#D3DDFF" strokeOpacity={rimOpacity} />
          </g>
        </g>
      )}
      {obs && obs.n > 0 && <OutcomeRing k={obs.k} n={obs.n} />}
      <circle cx="800" cy="480" r="11" fill="#0b0e14" stroke="#E6EAF0" strokeOpacity="0.7" />

      <g opacity={showRuler ? 1 : 0} style={{ transition: 'opacity 0.3s' }}>
        <line x1="785" y1="502" x2="815" y2="502" stroke="#7FF5E1" strokeWidth="0.9" />
        <line x1="785" y1="498" x2="785" y2="506" stroke="#7FF5E1" strokeWidth="0.9" />
        <line x1="815" y1="498" x2="815" y2="506" stroke="#7FF5E1" strokeWidth="0.9" />
        <text x="800" y="514" textAnchor="middle" fill="#7FF5E1" fontSize="8.5" fontFamily="var(--font-mono)">droplet d₀ (illustrative)</text>
      </g>
    </>
  );
});

// Labels sit outside the card rails: the left one reads right-to-left from the line, the right one sits above it.
const Callouts = memo(function Callouts({ scenario, mode, dim, atmosphere }: { scenario: Scenario; mode: ExplanationMode; dim: boolean; atmosphere?: string }) {
  return (
    <g className="scene-callouts" opacity={dim ? 0.35 : 1} style={{ transition: 'opacity 0.24s' }}>
      <circle cx="574" cy="316" r="5.5" fill="rgba(127, 245, 225, 0.25)" stroke="#7FF5E1" strokeWidth="1.5" />
      <circle cx="574" cy="316" r="9.5" fill="none" stroke="rgba(127, 245, 225, 0.18)" strokeWidth="1" />
      <polyline points="569,312 500,264 470,264" fill="none" stroke="rgba(199, 205, 212, 0.45)" strokeWidth="1" />
      <circle cx="470" cy="264" r="2" fill="#F2F4F6" />
      <text x="462" y="261" textAnchor="end" fill="#F2F4F6" fontSize="12" fontWeight="500" fontFamily="var(--font-mono)">Gravity</text>
      <text x="462" y="276" textAnchor="end" fill="#8E96A0" fontSize="11" fontFamily="var(--font-mono)">
        {mode === 'engineer' ? '0 g buoyancy · ISS' : 'microgravity · ISS'}
      </text>

      <circle cx="1025" cy="288" r="5.5" fill="rgba(127, 245, 225, 0.25)" stroke="#7FF5E1" strokeWidth="1.5" />
      <circle cx="1025" cy="288" r="9.5" fill="none" stroke="rgba(127, 245, 225, 0.18)" strokeWidth="1" />
      <polyline points="1027,282 1048,196 1072,196" fill="none" stroke="rgba(199, 205, 212, 0.45)" strokeWidth="1" />
      <circle cx="1072" cy="196" r="2" fill="#F2F4F6" />
      <text x="1072" y="170" textAnchor="end" fill="#F2F4F6" fontSize="12" fontWeight="500" fontFamily="var(--font-mono)">Atmosphere</text>
      <text x="1072" y="185" textAnchor="end" fill="#8E96A0" fontSize="11" fontFamily="var(--font-mono)">
        {atmosphere ?? `${fmtCriterionO2(scenario)} · ${fmtCriterionP(scenario)}`}
      </text>
    </g>
  );
});

export const FlameScene = memo(function FlameScene({ scenario, mode = 'explorer', observed }: { scenario: Scenario; mode?: ExplanationMode; observed?: ObservedFlame }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const [level, setLevel] = useState<ZoomLevel>(1);

  // Illustrative flame scale from scenario O₂ & pressure (Earth 21% O₂ = 1.0x, Moon 30% = 1.18x, ...)
  const o2Val = scenario.criteria.o2.value;
  const pVal = scenario.criteria.pressure_psi.value;
  const flameScale = observed ? obsScale(observed.glow) : Number(Math.min(1.42, Math.max(0.86, 0.78 + o2Val * 1.15)).toFixed(2));
  const rimOpacity = observed ? 0.5 : Number(Math.min(0.75, Math.max(0.3, pVal / 22)).toFixed(2));

  // Fixed camera: no drag-to-rotate and no wheel zoom (the page must keep scrolling over the scene). The three
  // view buttons only pick a fixed scale around the flame.
  const setSemanticZoom = (lvl: ZoomLevel) => {
    worldRef.current?.setAttribute('transform', `translate(0 0) translate(800 480) scale(${SCALE_FOR_LEVEL[lvl]}) translate(-800 -480)`);
    setLevel(lvl);
  };

  // A soft ring leaves the flame whenever the atmosphere changes (not on first paint).
  const firstScenario = useRef(true);
  useEffect(() => {
    if (firstScenario.current) { firstScenario.current = false; return; }
    const el = svgRef.current;
    if (!el) return;
    el.classList.remove('flare');
    void el.getBoundingClientRect(); // restart the animation
    el.classList.add('flare');
    const t = window.setTimeout(() => el.classList.remove('flare'), 900);
    return () => window.clearTimeout(t);
  }, [scenario.id]);

  return (
    <div className="scene-layer">
      <svg
        ref={svgRef}
        id="scene"
        className="scene-svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Microgravity combustion chamber illustration for ${observed ? `custom settings (${observed.atmosphere}): ${observed.caption}` : scenario.label}.`}
      >
        <title>{`Microgravity spherical flame illustration (${scenario.label}) — not a combustion simulation`}</title>
        <Backdrop />
        <g ref={worldRef} transform={INITIAL_WORLD}>
          <g>
            <Chamber flameScale={flameScale} rimOpacity={rimOpacity} showRuler={level >= 2} obs={observed} />
          </g>
          <Callouts scenario={scenario} mode={mode} dim={level !== 1} atmosphere={observed?.atmosphere} />
        </g>
      </svg>

      <div className="zlevel" role="group" aria-label="Scene zoom level">
        {([[1, 'Chamber'], [2, 'Flame'], [3, 'Droplet']] as const).map(([lvl, label]) => (
          <button key={lvl} type="button" className={level === lvl ? 'on' : ''} aria-pressed={level === lvl} onClick={() => setSemanticZoom(lvl)}>
            {label}
          </button>
        ))}
      </div>

      <div className="scene-legend">
        <span>Illustration. Not a combustion simulation.</span>
        {observed && <span className="obs-caption">{observed.caption}</span>}
      </div>
    </div>
  );
});
