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
interface Tongue { rot: number; len: number; w: number; dur: number; delay: number; amp: number }
/** Microgravity: tongues spread all around the head (short, nearly radial, no tendency to rise). 1 g: clustered upward, longer. */
export function fireTongues(n: number, oneG: boolean): Tongue[] {
  return Array.from({ length: n }, (_, i) => {
    const rot = oneG ? -38 + (76 * i) / Math.max(1, n - 1) + (rr(i, 1) - 0.5) * 10 : (360 * i) / n + (rr(i, 1) - 0.5) * 24;
    const len = oneG ? 95 + rr(i, 2) * 70 - Math.abs(rot) * 0.9 : 84 + rr(i, 2) * 60;
    return { rot, len, w: oneG ? 20 + rr(i, 3) * 8 : 14 + rr(i, 3) * 8, dur: 0.8 + rr(i, 4) * 0.9, delay: -rr(i, 5) * 2, amp: 0.8 + rr(i, 6) * 0.5 };
  });
}
const tonguePath = (L: number, w: number, s: number) => `M${-w} 0 C${-w * 1.3} ${-L * 0.4} ${-w * 0.45 + s} ${-L * 0.72} ${s} ${-L} C${w * 0.45 + s} ${-L * 0.72} ${w * 1.3} ${-L * 0.4} ${w} 0 Z`;

export const FireTongues = memo(function FireTongues({ look, oneG, scale, mode, grayscale, strong, intensity, lifecycle, animated, paused, phone }: FireProps) {
  const ember = mode === 'ember';
  if (mode === 'none' || mode === 'out') return null;
  const n = ember ? 4 : oneG ? (phone ? 6 : 8) : phone ? 6 : 9;
  const list = fireTongues(n, oneG);
  const sc = ember ? scale * 0.26 : oneG ? 1 : scale;
  const sparkN = ember ? 0 : phone ? 3 : 6;
  const op = ember ? 0.32 : Math.min(0.9, 0.55 + 0.4 * intensity);
  const stops = oneG ? ['#FFE9A8', '#FF9A3C', '#D8401A'] : grayscale ? ['#E6E6E6', '#A8A8A8', '#707070'] : [look.core, look.mid, look.edge];
  return (
    <g className={`fire${animated && lifecycle && !ember ? ' fire-life' : ''}${paused ? ' fire-paused' : ''}${strong ? ' fire-strong' : ''}`}
      data-fire={oneG ? '1g' : ember ? 'ember' : 'micro'} data-tongues={n} aria-hidden="true" style={{ opacity: op, mixBlendMode: 'screen' }}>
      <defs>
        <linearGradient id="fireTongue" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={stops[0]} /><stop offset="0.35" stopColor={stops[0]} stopOpacity="0.95" />
          <stop offset="0.65" stopColor={stops[1]} stopOpacity="0.85" /><stop offset="1" stopColor={stops[2]} stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="fireCore"><stop offset="0" stopColor="#FFFFFF" /><stop offset="0.5" stopColor={stops[0]} stopOpacity="0.9" /><stop offset="1" stopColor={stops[1]} stopOpacity="0" /></radialGradient>
      </defs>
      <g transform={`translate(${HX} ${HY}) scale(${sc})`}>
        {list.map((t, i) => (
          <g key={i} transform={`rotate(${t.rot.toFixed(1)})`}>
            <g className={animated ? 'ft' : undefined} style={{ ['--dur' as string]: `${t.dur.toFixed(2)}s`, ['--delay' as string]: `${t.delay.toFixed(2)}s`, ['--amp' as string]: t.amp.toFixed(2) }}>
              <path d={tonguePath(t.len, t.w, (rr(i, 12) - 0.5) * t.w * 0.7)} fill="url(#fireTongue)" />
            </g>
          </g>
        ))}
        <circle className={animated ? 'fire-core' : undefined} cx="0" cy={oneG ? -14 : 0} r={oneG ? 22 : 34} fill="url(#fireCore)" />
        {Array.from({ length: sparkN }, (_, i) => {
          const th = oneG ? (-90 + (rr(i, 8) - 0.5) * 60) * Math.PI / 180 : (rr(i, 8) * 360) * Math.PI / 180, d = 90 + rr(i, 9) * 80;
          return <circle key={`s${i}`} className={animated ? 'fire-spark' : undefined} cx={Math.cos(th) * 30} cy={Math.sin(th) * 30} r="1.8" fill="#FFD27A"
            style={{ ['--dx' as string]: `${(Math.cos(th) * d).toFixed(0)}px`, ['--dy' as string]: `${(Math.sin(th) * d).toFixed(0)}px`, ['--dur' as string]: `${(1.4 + rr(i, 10) * 1.2).toFixed(2)}s`, ['--delay' as string]: `${(-rr(i, 11) * 3).toFixed(2)}s` }} />;
        })}
      </g>
    </g>
  );
});
