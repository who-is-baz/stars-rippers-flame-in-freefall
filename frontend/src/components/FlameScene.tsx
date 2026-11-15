// Interactive 2.5D Microgravity Combustion Chamber Scene (flame-v3-reference.html + reference image).
// Driven by the active atmosphere scenario from scenarios.json (O₂ fraction scales flame radius & brightness).
import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import type { Scenario } from '../data/types';
import type { ExplanationMode } from '../state/ui';
import { fmtCriterionO2, fmtCriterionP } from '../lib/scenario';

export type ZoomLevel = 1 | 2 | 3; // 1 = Chamber, 2 = Flame, 3 = Droplet

const SCALE_FOR_LEVEL: Record<ZoomLevel, number> = { 1: 1, 2: 1.85, 3: 2.9 };

export function FlameScene({
  scenario,
  mode = 'explorer',
}: {
  scenario: Scenario;
  mode?: ExplanationMode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [k, setK] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [ang, setAng] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number; ang: number } | null>(null);

  const zoomLevel: ZoomLevel = k < 1.5 ? 1 : k < 2.5 ? 2 : 3;

  // Compute illustrative flame scale from scenario O₂ & pressure criteria (Earth 21% O₂ = 1.0x, Moon 30% = 1.18x, etc.)
  const o2Val = scenario.criteria.o2.value;
  const pVal = scenario.criteria.pressure_psi.value;
  const flameScale = Number(Math.min(1.42, Math.max(0.86, 0.78 + o2Val * 1.15)).toFixed(2));
  const rimOpacity = Number(Math.min(0.75, Math.max(0.3, pVal / 22)).toFixed(2));

  const setSemanticZoom = (lvl: ZoomLevel) => {
    setHintUsed(true);
    setK(SCALE_FOR_LEVEL[lvl]);
    if (lvl === 1) {
      setTx(0);
      setTy(0);
    }
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    setHintUsed(true);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx, ty, ang };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in test environments without setPointerCapture
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (k > 1.5) {
      setTx(dragStart.current.tx + dx);
      setTy(dragStart.current.ty + dy);
    } else {
      setAng(dragStart.current.ang + dx * 0.25);
    }
  };

  const onPointerUp = () => {
    dragStart.current = null;
    setDragging(false);
  };

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setHintUsed(true);
    setK((prev) => Math.max(0.85, Math.min(3.8, prev * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setHintUsed(true);
      setK((prev) => Math.min(3.8, prev * 1.25));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      setHintUsed(true);
      setK((prev) => Math.max(0.85, prev / 1.25));
    } else if (e.key === '0') {
      e.preventDefault();
      setK(1);
      setTx(0);
      setTy(0);
      setAng(0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setAng((a) => a - 8);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setAng((a) => a + 8);
    }
  };

  const worldTransform = `translate(${tx} ${ty}) translate(800 480) scale(${k}) translate(-800 -480)`;
  const rotTransform = `rotate(${ang} 800 480)`;

  return (
    <div className="scene-layer">
      <svg
        ref={svgRef}
        id="scene"
        className={`scene-svg${dragging ? ' drag' : ''}`}
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        tabIndex={0}
        role="img"
        aria-label={`Microgravity combustion chamber illustration for ${scenario.label}. Drag to rotate, scroll or use plus and minus keys to zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <title>{`Microgravity spherical flame illustration (${scenario.label}) — not a combustion simulation`}</title>
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
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <pattern id="starsPat" width="160" height="160" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="20" r="0.8" fill="#fff" opacity="0.35" />
            <circle cx="90" cy="60" r="0.6" fill="#fff" opacity="0.25" />
            <circle cx="140" cy="130" r="0.9" fill="#fff" opacity="0.3" />
            <circle cx="50" cy="110" r="0.5" fill="#fff" opacity="0.2" />
          </pattern>
        </defs>

        <rect width="1600" height="1000" fill="url(#bgglow)" />
        <rect width="1600" height="1000" fill="url(#starsPat)" />

        {/* Subtle background calibration crosses */}
        <g stroke="#5B636D" strokeWidth="1" opacity="0.45">
          <path d="M 552 228 h 8 M 556 224 v 8" />
          <path d="M 1044 228 h 8 M 1048 224 v 8" />
          <path d="M 508 660 h 8 M 512 656 v 8" />
          <path d="M 1084 660 h 8 M 1088 656 v 8" />
        </g>

        <g transform={worldTransform}>
          <g transform={rotTransform}>
            {/* Chamber window: outer metallic bezel */}
            <circle cx="800" cy="480" r="330" fill="url(#metalGrad)" />
            <circle cx="800" cy="480" r="330" fill="none" stroke="url(#rimGrad)" strokeWidth="2.5" />

            {/* 8 chamber mounting bolts */}
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

            {/* Inner dark viewport */}
            <circle cx="800" cy="480" r="280" fill="#05070a" stroke="#3A4048" strokeWidth="1.5" />
            <circle cx="800" cy="480" r="272" fill="none" stroke="url(#rimGrad)" strokeWidth="1" />

            {/* Optical reticle */}
            <g stroke="#5B636D" strokeOpacity="0.55" fill="none">
              <circle cx="800" cy="480" r="235" strokeDasharray="2 8" />
              <circle cx="800" cy="480" r="180" strokeOpacity="0.3" />
              <line x1="800" y1="215" x2="800" y2="250" />
              <line x1="800" y1="710" x2="800" y2="745" />
              <line x1="535" y1="480" x2="570" y2="480" />
              <line x1="1030" y1="480" x2="1065" y2="480" />
            </g>

            {/* Rotating reticle ring */}
            <g className="scene-spin-ring">
              <circle
                cx="800"
                cy="480"
                r="252"
                fill="none"
                stroke="#C7CDD4"
                strokeOpacity="0.18"
                strokeDasharray="60 18 4 18"
              />
            </g>

            {/* Quartz tether fiber + fuel droplet + spherical flame */}
            <line x1="800" y1="480" x2="800" y2="760" stroke="#8E96A0" strokeOpacity="0.55" strokeWidth="1.2" />
            <g
              className="scene-flame-group"
              style={{
                transformOrigin: '800px 480px',
                transform: `scale(${flameScale})`,
                transition: 'transform 0.6s var(--ease-out)',
              }}
            >
              <circle cx="800" cy="480" r="200" fill="url(#haloGrad)" />
              <circle cx="800" cy="480" r="118" fill="url(#flameGrad)" filter="url(#softBlur)" />
              <circle cx="800" cy="480" r="74" fill="none" stroke="#D3DDFF" strokeOpacity={rimOpacity} />
            </g>

            {/* Central fuel droplet */}
            <circle cx="800" cy="480" r="11" fill="#0b0e14" stroke="#E6EAF0" strokeOpacity="0.7" />

            {/* Droplet scale ruler (visible at Flame / Droplet zoom) */}
            <g opacity={zoomLevel >= 2 ? 1 : 0} style={{ transition: 'opacity 0.3s' }}>
              <line x1="785" y1="502" x2="815" y2="502" stroke="#7FF5E1" strokeWidth="0.9" />
              <line x1="785" y1="498" x2="785" y2="506" stroke="#7FF5E1" strokeWidth="0.9" />
              <line x1="815" y1="498" x2="815" y2="506" stroke="#7FF5E1" strokeWidth="0.9" />
              <text
                x="800"
                y="514"
                textAnchor="middle"
                fill="#7FF5E1"
                fontSize="8.5"
                fontFamily="var(--font-mono)"
              >
                droplet d₀ (illustrative)
              </text>
            </g>
          </g>

          {/* Leader-line callouts (matching the reference image) */}
          <g className="scene-callouts" opacity={zoomLevel === 1 ? 1 : 0.35} style={{ transition: 'opacity 0.24s' }}>
            {/* Left Callout: Gravity */}
            <circle cx="574" cy="316" r="5.5" fill="rgba(127, 245, 225, 0.25)" stroke="#7FF5E1" strokeWidth="1.5" />
            <circle cx="574" cy="316" r="9.5" fill="none" stroke="rgba(127, 245, 225, 0.18)" strokeWidth="1" />
            <polyline
              points="569,312 496,264 426,264"
              fill="none"
              stroke="rgba(199, 205, 212, 0.45)"
              strokeWidth="1"
            />
            <circle cx="426" cy="264" r="2" fill="#F2F4F6" />
            <text x="312" y="261" fill="#F2F4F6" fontSize="12" fontWeight="500" fontFamily="var(--font-mono)">
              Gravity
            </text>
            <text x="312" y="276" fill="#8E96A0" fontSize="11" fontFamily="var(--font-mono)">
              {mode === 'engineer' ? '0 g buoyancy · ISS' : 'microgravity · ISS'}
            </text>

            {/* Right Callout: Atmosphere */}
            <circle cx="1025" cy="288" r="5.5" fill="rgba(127, 245, 225, 0.25)" stroke="#7FF5E1" strokeWidth="1.5" />
            <circle cx="1025" cy="288" r="9.5" fill="none" stroke="rgba(127, 245, 225, 0.18)" strokeWidth="1" />
            <polyline
              points="1027,282 1048,192 1072,192"
              fill="none"
              stroke="rgba(199, 205, 212, 0.45)"
              strokeWidth="1"
            />
            <circle cx="1072" cy="192" r="2" fill="#F2F4F6" />
            <text x="1080" y="189" fill="#F2F4F6" fontSize="12" fontWeight="500" fontFamily="var(--font-mono)">
              Atmosphere
            </text>
            <text x="1080" y="204" fill="#8E96A0" fontSize="11" fontFamily="var(--font-mono)">
              {fmtCriterionO2(scenario)} · {fmtCriterionP(scenario)}
            </text>
          </g>
        </g>
      </svg>

      {/* Semantic Zoom Level Pill (top center) */}
      <div className="zlevel" role="group" aria-label="Scene zoom level">
        {([
          [1, 'Chamber'],
          [2, 'Flame'],
          [3, 'Droplet'],
        ] as const).map(([lvl, label]) => (
          <button
            key={lvl}
            type="button"
            className={zoomLevel === lvl ? 'on' : ''}
            aria-pressed={zoomLevel === lvl}
            onClick={() => setSemanticZoom(lvl)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Zoom + / - / Reset Buttons (bottom right of scene) */}
      <div className="zoom-controls" role="group" aria-label="Camera controls">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => {
            setHintUsed(true);
            setK((prev) => Math.min(3.8, prev * 1.3));
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => {
            setHintUsed(true);
            setK((prev) => Math.max(0.85, prev / 1.3));
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={() => {
            setK(1);
            setTx(0);
            setTy(0);
            setAng(0);
          }}
        >
          ⟲
        </button>
      </div>

      {/* Fixed honesty legend */}
      <div className="scene-legend">
        <span>Illustration. Not a combustion simulation.</span>
        <span style={{ opacity: hintUsed ? 0.45 : 1, transition: 'opacity 0.3s' }}>
          drag to rotate · scroll to zoom
        </span>
      </div>
    </div>
  );
}
