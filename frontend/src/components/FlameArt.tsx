// Illustrative flame artwork for the chamber scene (SVG only, no libraries): match stick, oxygen particles, 1 g reference flame.
// Everything here is decoration driven by lib/flameLook.ts; none of it encodes a measurement.
import { memo, useEffect, useState } from 'react';
import type { FlameLook, Particle } from '../lib/flameLook';

export const REF_1G_NOTE = 'Reference only. This dataset has no 1 g or partial-gravity tests.';
export const NO_TESTS_NOTE = 'No matching tests — illustration only';

function useMedia(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [v, setV] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(query);
    const on = () => setV(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, [query]);
  return v;
}
export const usePrefersReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useIsPhone = () => useMedia('(max-width: 640px)');
/** True while the tab is hidden: the animation is paused so a background tab costs nothing. */
export function usePageHidden(): boolean {
  const [h, setH] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const on = () => setH(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return h;
}

/** Gradients of the current look (colour stops from flameLook). ids: flameLook, haloLook. */
export const LookDefs = memo(function LookDefs({ look }: { look: FlameLook }) {
  return (
    <defs>
      <radialGradient id="flameLook" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={look.core} />
        <stop offset="0.35" stopColor={look.core} stopOpacity="0.95" />
        <stop offset="0.65" stopColor={look.mid} stopOpacity={0.55 + 0.4 * look.glow} />
        <stop offset="0.9" stopColor={look.edge} stopOpacity={0.25 + 0.3 * look.glow} />
        <stop offset="1" stopColor={look.edge} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="haloLook" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={look.mid} stopOpacity={look.haloOpacity} />
        <stop offset="1" stopColor={look.mid} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9A6B3E" />
        <stop offset="0.5" stopColor="#D2A46C" />
        <stop offset="1" stopColor="#8A5C33" />
      </linearGradient>
    </defs>
  );
});

/** Thin wooden rod with a dark head holding the flame at its tip (the sample holder metaphor). Head centre (800, 494). */
export const MatchStick = memo(function MatchStick() {
  return (
    <g className="match-stick" data-part="match-stick">
      <rect x="796" y="498" width="8" height="262" rx="2.5" fill="url(#woodGrad)" stroke="#5E4026" strokeOpacity="0.6" strokeWidth="0.6" />
      <line x1="800" y1="520" x2="800" y2="740" stroke="#6B4A2A" strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="14 22" />
      <ellipse cx="800" cy="492" rx="11" ry="14" fill="#2A1810" stroke="#6A4630" strokeWidth="1" />
      <ellipse cx="796" cy="487" rx="3.5" ry="5" fill="#fff" opacity="0.14" />
    </g>
  );
});

/** Small oxygen particles that float slowly (CSS keyframes, translate only). Static when motion is reduced. */
export const Particles = memo(function Particles({ list, animated, kind }: { list: Particle[]; animated: boolean; kind: 'diffusion' | 'rising' }) {
  return (
    <g className="o2-layer" data-particles={kind} data-count={list.length} aria-hidden="true">
      {list.map((p, i) => (
        <circle key={i} className={`o2p${animated ? '' : ' o2p-static'}`} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r}
          style={{ ['--dx' as string]: `${p.dx.toFixed(1)}px`, ['--dy' as string]: `${p.dy.toFixed(1)}px`, ['--dur' as string]: `${p.dur}s`, ['--delay' as string]: `${p.delay.toFixed(2)}s` }} />
      ))}
    </g>
  );
});

/** Normal-gravity flame (reference only): elongated red-orange teardrop pointing up, held by the same match. No data attached. */
export const OneGFlame = memo(function OneGFlame({ animated }: { animated: boolean }) {
  return (
    <g className={animated ? 'flame-1g' : undefined} data-flame="1g">
      <defs>
        <linearGradient id="flame1gOuter" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#B22E10" /><stop offset="0.45" stopColor="#E8501A" /><stop offset="1" stopColor="#FF9D4D" />
        </linearGradient>
        <linearGradient id="flame1gInner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFB347" /><stop offset="1" stopColor="#FFF0B3" />
        </linearGradient>
      </defs>
      <path d="M800 486 C735 478 720 410 768 348 C783 326 792 296 800 248 C810 296 818 326 832 350 C880 410 866 478 800 486 Z" fill="url(#flame1gOuter)" opacity="0.95" />
      <path d="M800 482 C768 476 760 436 782 400 C792 384 797 366 800 338 C805 366 810 384 820 402 C840 436 832 476 800 482 Z" fill="url(#flame1gInner)" opacity="0.92" />
    </g>
  );
});

// ---------- animated fire layer: tongues of flame in front of the glow (conceptual illustration, no data attached) ----------
export interface FireProps {
  look: FlameLook; oneG: boolean; scale: number;
  mode: 'burning' | 'ember' | 'out' | 'none'; grayscale: boolean; strong: boolean; intensity: number;
  lifecycle: boolean; animated: boolean; paused: boolean; phone: boolean;
}
const HX = 800, HY = 490;                       // match head centre
const rr = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export type FireLayer = 'outer' | 'inner';
interface Tongue { rot: number; len: number; w: number; dur: number; delay: number; amp: number; skew: number; base: number; lean: number }
/**
 * Lobes of flame around the head. Microgravity: SHORT, BROAD, round-tipped lobes spread all around (no buoyancy, so no
 * preferred direction), overlapping in an outer and an inner layer like the outer / inner zones of a flame, with small
 * deterministic variations of length, width and angle so it never reads as a symmetric star. 1 g (reference): a few
 * long lobes clustered upward, forming the classic candle tear-drop.
 */
export function fireTongues(n: number, oneG: boolean, layer: FireLayer = 'outer'): Tongue[] {
  const k = layer === 'inner' ? 20 : 0;                     // different seeds per layer
  const off = layer === 'inner' ? 11 : 0;                    // the rings do not share angles
  return Array.from({ length: n }, (_, i) => {
    const j = (a: number) => rr(i, a + k);
    if (oneG) {
      const rot = (layer === 'inner' ? -7 : -13) + ((layer === 'inner' ? 14 : 26) * i) / Math.max(1, n - 1) + (j(1) - 0.5) * 5;
      const len = (layer === 'inner' ? 72 + j(2) * 18 : 122 + j(2) * 26) - Math.abs(rot) * 0.9;
      const w = layer === 'inner' ? 15 + j(3) * 4 : 25 + j(3) * 7;
      return { rot, len, w, base: 0, lean: 0, dur: 0.6 + j(4) * 0.7, delay: -j(5) * 3, amp: 0.6 + j(6) * 0.8, skew: (j(7) - 0.5) * w * 0.6 };
    }
    // Microgravity: a corona of short flame tongues licking out from the surface of the luminous sphere, all around.
    // Similar sizes (small variation only), slightly irregular angles; each one leans and curls to its own side and the
    // neighbours overlap, so the ring reads as licking fire and not as separate petals.
    const rot = (360 * i) / n + off + (j(1) - 0.5) * (300 / n);
    const len = layer === 'inner' ? 40 + j(2) * 13 : 56 + j(2) * 20;
    const w = layer === 'inner' ? 14 + j(3) * 4 : 19 + j(3) * 6;
    const side = j(7) < 0.5 ? -1 : 1;
    const curl = side * (0.5 + j(8) * 0.45) * w;
    return {
      rot, len, w, base: layer === 'inner' ? 26 : 46, lean: side * (6 + j(9) * 14),
      dur: (layer === 'inner' ? 0.55 : 0.8) + j(4) * (layer === 'inner' ? 0.6 : 0.9),
      delay: -j(5) * 3, amp: 0.6 + j(6) * 0.8, skew: curl,
    };
  });
}
/**
 * Flame-tongue shape pointing to −y: a wide ROUNDED base, flanks that narrow towards a soft tip, and the tip shifted by
 * `curl` so it bends a little to one side (asymmetric flanks). No straight needle and no symmetric petal.
 */
export const flamePath = (L: number, w: number, curl: number) =>
  `M${-w} 0 C${-w * 1.05} ${-L * 0.38} ${-w * 0.42 + curl * 0.35} ${-L * 0.66} ${curl} ${-L} ` +
  `C${w * 0.3 + curl * 0.55} ${-L * 0.76} ${w * 1.08} ${-L * 0.42} ${w} 0 C${w * 0.6} ${w * 0.85} ${-w * 0.6} ${w * 0.85} ${-w} 0 Z`;
/** Kept for reference: lobe with a round dome tip (the previous design). */
export const lobePath = (L: number, w: number, s: number, tip: number) =>
  `M${-w} 0 C${-w} ${-L * 0.55} ${-w * tip + s} ${-L} ${s} ${-L} C${w * tip + s} ${-L} ${w} ${-L * 0.55} ${w} 0 C${w * 0.55} ${w * 0.75} ${-w * 0.55} ${w * 0.75} ${-w} 0 Z`;
/**
 * Tongue counts per ring: fewer on a phone, a faint few as an ember. The two microgravity rings have counts with no
 * common divisor (15 and 7, 11 and 5), so they never share a rotational symmetry (no rosette).
 */
export function fireCounts(oneG: boolean, phone: boolean, ember: boolean): { outer: number; inner: number } {
  if (ember) return { outer: 7, inner: 0 };
  if (oneG) return phone ? { outer: 3, inner: 2 } : { outer: 4, inner: 3 };
  return phone ? { outer: 11, inner: 5 } : { outer: 15, inner: 7 };
}

export const FireTongues = memo(function FireTongues({ look, oneG, scale, mode, grayscale, strong, intensity, lifecycle, animated, paused, phone }: FireProps) {
  const ember = mode === 'ember';
  if (mode === 'none' || mode === 'out') return null;
  const c = fireCounts(oneG, phone, ember);
  const n = c.outer + c.inner;
  const outer = fireTongues(c.outer, oneG, 'outer');
  const inner = fireTongues(c.inner, oneG, 'inner');
  const sc = ember ? scale * 0.3 : oneG ? 1 : scale;
  const sparkN = ember ? 0 : phone ? 3 : 6;
  const op = ember ? 0.32 : Math.min(0.9, 0.55 + 0.4 * intensity);
  const stops = oneG ? ['#FFE9A8', '#FF9A3C', '#D8401A'] : grayscale ? ['#E6E6E6', '#A8A8A8', '#707070'] : [look.core, look.mid, look.edge];
  const lobe = (t: Tongue, i: number, layer: FireLayer) => (
    <g key={`${layer}${i}`} transform={`rotate(${t.rot.toFixed(1)}) translate(0 ${-t.base}) rotate(${(ember ? t.lean * 0.25 : t.lean).toFixed(1)})${ember ? ' scale(1.15 0.55)' : ''}`}>
      <g className={animated ? `ft fl${layer === 'inner' ? ' fl-in' : ''}` : undefined}
        style={{ ['--dur' as string]: `${t.dur.toFixed(2)}s`, ['--delay' as string]: `${t.delay.toFixed(2)}s`, ['--amp' as string]: t.amp.toFixed(2) }}>
        <path d={flamePath(t.len, t.w, t.skew)} fill={layer === 'inner' ? 'url(#fireLobeIn)' : 'url(#fireLobe)'} opacity={layer === 'inner' ? 0.85 : 0.8} />
      </g>
    </g>
  );
  return (
    <g className={`fire${animated && lifecycle && !ember ? ' fire-life' : ''}${paused ? ' fire-paused' : ''}${strong ? ' fire-strong' : ''}`}
      data-fire={oneG ? '1g' : ember ? 'ember' : 'micro'} data-tongues={n} aria-hidden="true" style={{ opacity: op, mixBlendMode: 'screen' }}>
      <defs>
        {/* outer zone: from the body colour at the base to a transparent edge at the rounded tip */}
        <linearGradient id="fireLobe" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={stops[0]} stopOpacity="0.9" /><stop offset="0.42" stopColor={stops[1]} stopOpacity="0.8" />
          <stop offset="0.72" stopColor={stops[2]} stopOpacity="0.45" /><stop offset="0.95" stopColor={stops[2]} stopOpacity="0" />
        </linearGradient>
        {/* inner zone: brighter and hotter, fades sooner */}
        <linearGradient id="fireLobeIn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" /><stop offset="0.4" stopColor={stops[0]} stopOpacity="0.85" />
          <stop offset="1" stopColor={stops[1]} stopOpacity="0" />
        </linearGradient>
        {/* luminous sphere: core → mid → edge */}
        <radialGradient id="fireSphere"><stop offset="0" stopColor={stops[0]} /><stop offset="0.3" stopColor={stops[0]} stopOpacity="0.92" />
          <stop offset="0.65" stopColor={stops[1]} stopOpacity="0.6" /><stop offset="1" stopColor={stops[2]} stopOpacity="0" /></radialGradient>
        {/* faint outer shell that breathes: transparent inside, a thin warm rim, fading out */}
        <radialGradient id="fireShell"><stop offset="0.55" stopColor={stops[1]} stopOpacity="0" /><stop offset="0.8" stopColor={stops[2]} stopOpacity="0.22" />
          <stop offset="1" stopColor={stops[2]} stopOpacity="0" /></radialGradient>
        <radialGradient id="fireCore"><stop offset="0" stopColor="#FFFFFF" /><stop offset="0.5" stopColor={stops[0]} stopOpacity="0.9" /><stop offset="1" stopColor={stops[1]} stopOpacity="0" /></radialGradient>
      </defs>
      <g transform={`translate(${HX} ${HY}) scale(${sc})`}>
        {!oneG && <circle className={animated ? 'fire-shell' : undefined} cx="0" cy="0" r={ember ? 70 : 104} fill="url(#fireShell)" data-part="fire-shell" />}
        {!oneG && <circle className={animated ? 'fire-sphere' : undefined} cx="0" cy="0" r={ember ? 40 : 60} fill="url(#fireSphere)" data-part="fire-sphere" />}
        {outer.map((t, i) => lobe(t, i, 'outer'))}
        {inner.map((t, i) => lobe(t, i, 'inner'))}
        <circle className={animated ? 'fire-core' : undefined} cx="0" cy={oneG ? -16 : 0} r={oneG ? 20 : 28} fill="url(#fireCore)" />
        {Array.from({ length: sparkN }, (_, i) => {
          const th = oneG ? (-90 + (rr(i, 8) - 0.5) * 60) * Math.PI / 180 : (rr(i, 8) * 360) * Math.PI / 180, d = 90 + rr(i, 9) * 80;
          return <circle key={`s${i}`} className={animated ? 'fire-spark' : undefined} cx={Math.cos(th) * 30} cy={Math.sin(th) * 30} r="1.8" fill="#FFD27A"
            style={{ ['--dx' as string]: `${(Math.cos(th) * d).toFixed(0)}px`, ['--dy' as string]: `${(Math.sin(th) * d).toFixed(0)}px`, ['--dur' as string]: `${(1.4 + rr(i, 10) * 1.2).toFixed(2)}s`, ['--delay' as string]: `${(-rr(i, 11) * 3).toFixed(2)}s` }} />;
        })}
      </g>
    </g>
  );
});
