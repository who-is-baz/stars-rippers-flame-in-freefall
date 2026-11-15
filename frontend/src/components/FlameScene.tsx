// 2.5D Microgravity Combustion Chamber Scene (flame-v3-reference.html + reference image), fixed camera.
// Driven by the active atmosphere scenario from scenarios.json (O₂ fraction scales flame radius & brightness).
// No drag-to-rotate and no wheel zoom: the page keeps scrolling over the scene. The static artwork is memoized and
// has no SVG filters, so changing a card never forces the whole scene to repaint.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Scenario } from '../data/types';
import type { ExplanationMode } from '../state/ui';
import { fmtCriterionO2, fmtCriterionP } from '../lib/scenario';
import type { FlameState } from '../lib/explorer';
import { diffusionParticles, flameLook, particleCount, risingParticles, type FlameLook, type Particle } from '../lib/flameLook';
import { MatchBurn, MATCH_REGION } from './MatchBurn';
import { matchBurnParams } from '../lib/matchBurn';
import { StarField } from './StarField';
import { FireTongues, type FireProps, LookDefs, MatchStick, NO_TESTS_NOTE, OneGFlame, Particles, REF_1G_NOTE, useIsPhone, usePageHidden, usePrefersReducedMotion } from './FlameArt';

// Custom explorer ("observed" mode): the flame is driven only by matched FLEX tests (lib/explorer.ts).
// glow = observed mean burning rate on the fixed GLOBAL FLEX scale (0–1, never rescaled per selection).
export interface ObservedFlame { state: FlameState; glow: number | null; k: number; n: number; atmosphere: string; caption: string; o2?: number; psi?: number }
const obsScale = (glow: number | null) => (glow == null ? 1 : Number((0.8 + 0.6 * glow).toFixed(3)));

export type ZoomLevel = 1 | 2 | 3; // 1 = Chamber, 2 = Flame, 3 = Droplet

const SCALE_FOR_LEVEL: Record<ZoomLevel, number> = { 1: 1, 2: 1.85, 3: 2.9 };
const INITIAL_WORLD = 'translate(0 0) translate(800 480) scale(1) translate(-800 -480)';


// Static gradients and reticle marks: depend on nothing, so they render once. The space background and the
// animated stars live in <StarField> (HTML layers behind this SVG), so animating them never repaints the scene.
const Backdrop = memo(function Backdrop() {
  return (
    <>
      <defs>
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
      </defs>
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

interface ChamberArt { look: FlameLook; level: ZoomLevel; oneG: boolean; particles: Particle[]; animated: boolean; dim: boolean; fx: FxProps | null; fire: FireProps | null }
interface FxProps { params: ReturnType<typeof matchBurnParams>; scale: number; phone: boolean; sizeKey: string; onReady: (ok: boolean) => void }
const Chamber = memo(function Chamber({ flameScale, rimOpacity, obs, art }: { flameScale: number; rimOpacity: number; obs?: ObservedFlame; art: ChamberArt }) {
  const { look, level, oneG, particles, animated, dim, fx, fire } = art;
  const showRuler = level === 3;
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
      <LookDefs look={look} />
      {level === 3 ? <line x1="800" y1="480" x2="800" y2="760" stroke="#8E96A0" strokeOpacity="0.55" strokeWidth="1.2" /> : <MatchStick />}
      {!(obs?.state === 'empty') && !(obs && (obs.state === 'out')) && <Particles list={particles} animated={animated} kind={oneG ? 'rising' : 'diffusion'} />}
      {oneG ? <OneGFlame animated={animated} /> : obs?.state === 'empty' ? (
        <g className="obs-empty" data-obs-state="empty">
          <circle cx="800" cy="480" r="150" fill="url(#hatchPat)" stroke="#5B636D" strokeDasharray="6 6" />
          <text x="800" y="424" textAnchor="middle" fill="#C7CDD4" fontSize="15" fontFamily="var(--font-mono)">No test within tolerance</text>
          <text x="800" y="446" textAnchor="middle" fill="#8E96A0" fontSize="12" fontFamily="var(--font-mono)">of these settings</text>
        </g>
      ) : (
        <g style={{ transformOrigin: '800px 480px', transform: `scale(${flameScale})`, transition: 'transform 0.6s var(--ease-out)', opacity: dim ? 0.35 : undefined }}
          className={obs ? `obs-flame obs-${obs.state}` : undefined} data-obs-state={obs?.state} data-obs-scale={obs ? flameScale : undefined} data-flame="micro">
          <circle className="flame-ring" cx="800" cy="480" r="118" fill="none" stroke="#D3DDFF" strokeWidth="2" />
          <g className={!obs || obs.state === 'stable' ? 'flame-breath' : obs.state === 'mixed' ? 'obs-flicker' : undefined}>
            <circle cx="800" cy="480" r={look.haloRadius} fill="url(#haloLook)" />
            <circle cx="800" cy="480" r="118" fill={obs?.state === 'small_n' ? 'url(#flameGradGrey)' : 'url(#flameLook)'} />
            <circle cx="800" cy="480" r="74" fill="none" stroke="#D3DDFF" strokeOpacity={rimOpacity} />
          </g>
        </g>
      )}
      {fire && <FireTongues key={`${fire.oneG}-${fire.mode}-${fire.grayscale}-${fire.look.core}`} {...fire} />}
      {fx && <foreignObject x={MATCH_REGION.x} y={MATCH_REGION.y} width={MATCH_REGION.w} height={MATCH_REGION.h} style={{ pointerEvents: 'none' }}>
        <MatchBurn params={fx.params} scale={fx.scale} oneG={oneG} phone={fx.phone} sizeKey={fx.sizeKey} onReady={fx.onReady} />
      </foreignObject>}
      {obs && obs.n > 0 && !oneG && <OutcomeRing k={obs.k} n={obs.n} />}
      {level === 3 && <circle cx="800" cy="480" r="11" fill="#0b0e14" stroke="#E6EAF0" strokeOpacity="0.7" />}
      {dim && !oneG && <text x="800" y="700" textAnchor="middle" fill="#E6EAF0" fontSize="15" fontFamily="var(--font-mono)" stroke="#05070a" strokeWidth="7" paintOrder="stroke" strokeLinejoin="round" data-note="no-tests">{NO_TESTS_NOTE}</text>}

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
  const [oneG, setOneG] = useState(false);          // "Earth 1 g (illustration)": reference only, never tied to data
  const reduced = usePrefersReducedMotion();
  const hidden = usePageHidden();
  const phone = useIsPhone();

  // Illustrative flame scale from scenario O₂ & pressure (Earth 21% O₂ = 1.0x, Moon 30% = 1.18x, ...)
  const o2Val = scenario.criteria.o2.value;
  const pVal = scenario.criteria.pressure_psi.value;
  const flameScale = observed ? obsScale(observed.glow) : Number(Math.min(1.42, Math.max(0.86, 0.78 + o2Val * 1.15)).toFixed(2));
  // Illustrative look: colour by O₂, halo by pressure. In Custom, size and brightness still come from the observed data.
  const lookO2 = observed?.o2 ?? o2Val, lookPsi = observed?.psi ?? pVal;
  const noTests = !observed && scenario.n_exact === 0 && scenario.n_near === 0;
  const look = useMemo(() => flameLook(lookO2, lookPsi), [lookO2, lookPsi]);
  const nParticles = oneG ? (phone ? 8 : 16) : Math.max(4, Math.round(particleCount(lookO2, phone) * (noTests ? 0.4 : 1)));
  const particles = useMemo(() => (oneG ? risingParticles(nParticles) : diffusionParticles(nParticles)), [oneG, nParticles]);
  const [fxReady, setFxReady] = useState(false);
  const burn = useMemo(() => matchBurnParams({ custom: observed?.state ?? null, glow: observed?.glow ?? null, o2: lookO2, psi: lookPsi, noTests, oneG, reducedMotion: reduced, phone }),
    [observed?.state, observed?.glow, lookO2, lookPsi, noTests, oneG, reduced, phone]);
  const fxEligible = level !== 3 && burn.mode !== 'none';
  const fxProps = useMemo<FxProps | null>(() => (fxEligible ? { params: burn, scale: flameScale, phone, sizeKey: String(level), onReady: setFxReady } : null), [fxEligible, burn, flameScale, phone, level]);
  const fire = useMemo<FireProps | null>(() => (level === 3 ? null : { look, oneG, scale: flameScale, mode: burn.mode, grayscale: burn.grayscale, strong: observed?.state === 'mixed', intensity: burn.intensity,
    lifecycle: burn.lifecycle, animated: !reduced, paused: hidden, phone }), [level, look, oneG, flameScale, burn, observed?.state, reduced, hidden, phone]);
  const art = useMemo(() => ({ look, level, oneG, particles, animated: !reduced && !hidden, dim: noTests, fx: fxProps, fire }), [look, level, oneG, particles, reduced, hidden, noTests, fxProps, fire]);
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
    <div className="scene-layer" data-fx={fxEligible && fxReady ? 'on' : 'off'}>
      <StarField phone={phone} paused={hidden} />
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
            <Chamber flameScale={flameScale} rimOpacity={rimOpacity} obs={observed} art={art} />
          </g>
          <Callouts scenario={scenario} mode={mode} dim={level !== 1} atmosphere={oneG ? 'Earth 1 g (illustration)' : observed?.atmosphere} />
        </g>
      </svg>

      <div className="zlevel" role="group" aria-label="Scene zoom level">
        {([[1, 'Chamber'], [2, 'Flame'], [3, 'Droplet']] as const).map(([lvl, label]) => (
          <button key={lvl} type="button" className={level === lvl ? 'on' : ''} aria-pressed={level === lvl} onClick={() => setSemanticZoom(lvl)}>
            {label}
          </button>
        ))}
      </div>

      <button type="button" className="onegtoggle" aria-pressed={oneG} onClick={() => setOneG((v) => !v)}
        title="Show the typical flame in normal gravity next to nothing from this dataset: a reference picture only">
        {oneG ? 'Earth 1 g (illustration)' : 'Compare with 1 g'}
      </button>
      {oneG && <div className="ref-1g-note" role="note">{REF_1G_NOTE}</div>}

      <div className="scene-legend">
        <span>Conceptual illustration. Not a physical simulation or a prediction.</span>
        {observed && !oneG && <span className="obs-caption">{observed.caption}</span>}
        {observed && !oneG && <span className="obs-legend">Colour is illustrative (set by O₂); size and brightness come from the data.</span>}
      </div>
    </div>
  );
});
