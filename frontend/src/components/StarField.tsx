// Space background and star field, drawn as HTML layers BEHIND the scene SVG (siblings, not children).
// Each animated layer is a <div> holding a static SVG and is animated with transform or opacity only, so the browser
// runs it on the compositor: no frame of the star animation repaints the scene SVG. Every layer uses the scene's
// viewBox and preserveAspectRatio ("xMidYMid slice"), so the stars stay aligned with the chamber at any size.
// Decoration only: no data attached.
import { memo, type ReactNode } from 'react';

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

type Dot = [number, number, number, string?];
type Spark = [number, number, number, string, string];
const VB = { viewBox: '0 0 1600 1000', preserveAspectRatio: 'xMidYMid slice' } as const;
const Svg = ({ children }: { children: ReactNode }) => <svg {...VB} aria-hidden="true" focusable="false">{children}</svg>;
const tw = (cls: string) => /star-(t\d)/.exec(cls)?.[1] ?? 't1';

// drift layer -> twinkle group -> { dots, four-point sparkles }. The sparkles drift with layer 2, as before.
const DRIFTS = STAR_LAYERS.map((layer, d) => {
  const groups = new Map<string, { dots: Dot[]; sparks: Spark[] }>();
  for (const g of layer.groups) groups.set(tw(g.cls), { dots: g.stars, sparks: [] });
  if (d === 1) for (const s of SPARKLE_STARS) {
    const k = tw(s[4]);
    if (!groups.has(k)) groups.set(k, { dots: [], sparks: [] });
    groups.get(k)!.sparks.push(s);
  }
  return { d: d + 1, groups: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)) };
});

export const StarField = memo(function StarField({ phone, paused }: { phone: boolean; paused: boolean }) {
  return (
    <div className={`starfield${paused ? ' sf-paused' : ''}${phone ? ' sf-phone' : ''}`} aria-hidden="true" data-part="starfield">
      <Svg>
        <defs>
          <radialGradient id="sfGlow" cx="50%" cy="48%" r="55%">
            <stop offset="0" stopColor="#18213a" stopOpacity="0.9" />
            <stop offset="0.55" stopColor="#0a0d14" stopOpacity="0.9" />
            <stop offset="1" stopColor="#040506" />
          </radialGradient>
        </defs>
        <rect width="1600" height="1000" fill="#040506" />
        <rect width="1600" height="1000" fill="url(#sfGlow)" />
      </Svg>
      <div className="sf-layer sf-drift-bg">
        <Svg>
          <defs>
            <pattern id="sfStars" width="220" height="220" patternUnits="userSpaceOnUse">
              <circle cx="18" cy="28" r="0.85" fill="#fff" opacity="0.28" />
              <circle cx="114" cy="74" r="0.7" fill="#fff" opacity="0.22" />
              <circle cx="182" cy="164" r="0.9" fill="#fff" opacity="0.26" />
              <circle cx="64" cy="148" r="0.65" fill="#fff" opacity="0.2" />
            </pattern>
          </defs>
          <rect x="-40" y="-40" width="1680" height="1080" fill="url(#sfStars)" />
        </Svg>
      </div>
      {DRIFTS.map(({ d, groups }) => (
        <div key={d} className={`sf-layer sf-drift-${d}`}>
          {groups.map(([t, g]) => (
            <div key={t} className={`sf-layer sf-tw sf-${t}`}>
              <Svg>
                {g.dots.map(([cx, cy, r, fill], i) => (
                  <g key={i}>
                    {r >= 1.9 && <circle cx={cx} cy={cy} r={r * 2.6} fill={fill ?? '#D3DDFF'} opacity="0.2" />}
                    <circle cx={cx} cy={cy} r={r} fill={fill ?? '#FFFFFF'} />
                  </g>
                ))}
                {g.sparks.length > 0 && (
                  <g strokeWidth="1.15" strokeLinecap="round">
                    {g.sparks.map(([cx, cy, arm, color], i) => (
                      <g key={i} stroke={color}>
                        <circle cx={cx} cy={cy} r="2.2" fill={color} stroke="none" opacity="0.85" />
                        <line x1={cx - arm} y1={cy} x2={cx + arm} y2={cy} />
                        <line x1={cx} y1={cy - arm} x2={cx} y2={cy + arm} />
                      </g>
                    ))}
                  </g>
                )}
              </Svg>
            </div>
          ))}
        </div>
      ))}
      {!phone && [[210, 88, 305, 122, 1.6], [1180, 138, 1285, 176, 1.5]].map(([x1, y1, x2, y2, w], i) => (
        <div key={i} className={`sf-layer sf-meteor sf-meteor-${i + 1}`}>
          <Svg>
            <defs>
              <linearGradient id={`sfMeteor${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#7FF5E1" stopOpacity="0" />
                <stop offset="0.7" stopColor="#D3DDFF" stopOpacity="0.65" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`url(#sfMeteor${i})`} strokeWidth={w} strokeLinecap="round" />
          </Svg>
        </div>
      ))}
    </div>
  );
});
