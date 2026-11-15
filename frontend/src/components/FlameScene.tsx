// Interactive 2.5D Microgravity Combustion Chamber Scene (flame-v3-reference.html + reference image).
// Driven by the active atmosphere scenario from scenarios.json (O₂ fraction scales flame radius & brightness).
//
// Performance notes (the scene sits behind every card, so it must stay cheap):
// - Pan/zoom/rotate write the SVG transform attributes directly (one per animation frame). React only
//   re-renders when the semantic zoom level (Chamber/Flame/Droplet) actually changes.
// - The static artwork is memoized and has no SVG filters and no continuous animation, so dragging or
//   changing a card never forces the whole scene to repaint.
import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Scenario } from '../data/types';
import type { ExplanationMode } from '../state/ui';
import { fmtCriterionO2, fmtCriterionP } from '../lib/scenario';

export type ZoomLevel = 1 | 2 | 3; // 1 = Chamber, 2 = Flame, 3 = Droplet

const SCALE_FOR_LEVEL: Record<ZoomLevel, number> = { 1: 1, 2: 1.85, 3: 2.9 };
const K_MIN = 0.85;
const K_MAX = 3.8;
const INITIAL_WORLD = 'translate(0 0) translate(800 480) scale(1) translate(-800 -480)';
const INITIAL_ROT = 'rotate(0 800 480)';

interface View { k: number; tx: number; ty: number; ang: number }
const levelOf = (k: number): ZoomLevel => (k < 1.5 ? 1 : k < 2.5 ? 2 : 3);
const clampK = (k: number) => Math.max(K_MIN, Math.min(K_MAX, k));

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
        <pattern id="starsPat" width="160" height="160" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="20" r="0.8" fill="#fff" opacity="0.35" />
          <circle cx="90" cy="60" r="0.6" fill="#fff" opacity="0.25" />
          <circle cx="140" cy="130" r="0.9" fill="#fff" opacity="0.3" />
          <circle cx="50" cy="110" r="0.5" fill="#fff" opacity="0.2" />
        </pattern>
      </defs>
      <rect width="1600" height="1000" fill="url(#bgglow)" />
      <rect width="1600" height="1000" fill="url(#starsPat)" />
      <g stroke="#5B636D" strokeWidth="1" opacity="0.45">
        <path d="M 552 228 h 8 M 556 224 v 8" />
        <path d="M 1044 228 h 8 M 1048 224 v 8" />
        <path d="M 508 660 h 8 M 512 656 v 8" />
        <path d="M 1084 660 h 8 M 1088 656 v 8" />
      </g>
    </>
  );
});

const Chamber = memo(function Chamber({ flameScale, rimOpacity, showRuler }: { flameScale: number; rimOpacity: number; showRuler: boolean }) {
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
      <g style={{ transformOrigin: '800px 480px', transform: `scale(${flameScale})`, transition: 'transform 0.6s var(--ease-out)' }}>
        <circle className="flame-ring" cx="800" cy="480" r="118" fill="none" stroke="#D3DDFF" strokeWidth="2" />
        <g className="flame-breath">
          <circle cx="800" cy="480" r="200" fill="url(#haloGrad)" />
          <circle cx="800" cy="480" r="118" fill="url(#flameGrad)" />
          <circle cx="800" cy="480" r="74" fill="none" stroke="#D3DDFF" strokeOpacity={rimOpacity} />
        </g>
      </g>
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
const Callouts = memo(function Callouts({ scenario, mode, dim }: { scenario: Scenario; mode: ExplanationMode; dim: boolean }) {
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
        {fmtCriterionO2(scenario)} · {fmtCriterionP(scenario)}
      </text>
    </g>
  );
});

export const FlameScene = memo(function FlameScene({ scenario, mode = 'explorer' }: { scenario: Scenario; mode?: ExplanationMode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const rotRef = useRef<SVGGElement>(null);
  const view = useRef<View>({ k: 1, tx: 0, ty: 0, ang: 0 });
  const frame = useRef(0);
  const drag = useRef<{ x: number; y: number; v: View } | null>(null);
  const [level, setLevel] = useState<ZoomLevel>(1);
  const [hintUsed, setHintUsed] = useState(false);

  // Illustrative flame scale from scenario O₂ & pressure (Earth 21% O₂ = 1.0x, Moon 30% = 1.18x, ...)
  const o2Val = scenario.criteria.o2.value;
  const pVal = scenario.criteria.pressure_psi.value;
  const flameScale = Number(Math.min(1.42, Math.max(0.86, 0.78 + o2Val * 1.15)).toFixed(2));
  const rimOpacity = Number(Math.min(0.75, Math.max(0.3, pVal / 22)).toFixed(2));

  // Writes the transforms once per animation frame, no matter how many pointer events arrived.
  const paint = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { k, tx, ty, ang } = view.current;
      worldRef.current?.setAttribute('transform', `translate(${tx} ${ty}) translate(800 480) scale(${k}) translate(-800 -480)`);
      rotRef.current?.setAttribute('transform', `rotate(${ang} 800 480)`);
      const l = levelOf(k);
      setLevel((prev) => (prev === l ? prev : l));
    });
  };
  const update = (patch: Partial<View>) => { view.current = { ...view.current, ...patch }; setHintUsed(true); paint(); };
  const zoomBy = (f: number) => update({ k: clampK(view.current.k * f) });
  const reset = () => update({ k: 1, tx: 0, ty: 0, ang: 0 });

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

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

  // React attaches wheel listeners as passive; a native non-passive one lets us keep the page still while zooming.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSemanticZoom = (lvl: ZoomLevel) => update(lvl === 1 ? { k: SCALE_FOR_LEVEL[1], tx: 0, ty: 0 } : { k: SCALE_FOR_LEVEL[lvl] });

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, v: { ...view.current } };
    svgRef.current?.classList.add('drag');
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* test environments lack setPointerCapture */ }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.v.k > 1.5) update({ tx: d.v.tx + dx, ty: d.v.ty + dy });
    else update({ ang: d.v.ang + dx * 0.25 });
  };
  const onPointerUp = () => { drag.current = null; svgRef.current?.classList.remove('drag'); };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const key = e.key;
    if (key === '+' || key === '=') { e.preventDefault(); zoomBy(1.25); }
    else if (key === '-' || key === '_') { e.preventDefault(); zoomBy(1 / 1.25); }
    else if (key === '0') { e.preventDefault(); reset(); }
    else if (key === 'ArrowLeft') { e.preventDefault(); update({ ang: view.current.ang - 8 }); }
    else if (key === 'ArrowRight') { e.preventDefault(); update({ ang: view.current.ang + 8 }); }
  };

  return (
    <div className="scene-layer">
      <svg
        ref={svgRef}
        id="scene"
        className="scene-svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        tabIndex={0}
        role="img"
        aria-label={`Microgravity combustion chamber illustration for ${scenario.label}. Drag to rotate, scroll or use plus and minus keys to zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <title>{`Microgravity spherical flame illustration (${scenario.label}) — not a combustion simulation`}</title>
        <Backdrop />
        <g ref={worldRef} transform={INITIAL_WORLD}>
          <g ref={rotRef} transform={INITIAL_ROT}>
            <Chamber flameScale={flameScale} rimOpacity={rimOpacity} showRuler={level >= 2} />
          </g>
          <Callouts scenario={scenario} mode={mode} dim={level !== 1} />
        </g>
      </svg>

      <div className="zlevel" role="group" aria-label="Scene zoom level">
        {([[1, 'Chamber'], [2, 'Flame'], [3, 'Droplet']] as const).map(([lvl, label]) => (
          <button key={lvl} type="button" className={level === lvl ? 'on' : ''} aria-pressed={level === lvl} onClick={() => setSemanticZoom(lvl)}>
            {label}
          </button>
        ))}
      </div>

      <div className="zoom-controls" role="group" aria-label="Camera controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.3)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)}>−</button>
        <button type="button" aria-label="Reset view" onClick={reset}>⟲</button>
      </div>

      <div className="scene-legend">
        <span>Illustration. Not a combustion simulation.</span>
        <span style={{ opacity: hintUsed ? 0.45 : 1, transition: 'opacity 0.3s' }}>drag to rotate · scroll to zoom</span>
      </div>
    </div>
  );
});
