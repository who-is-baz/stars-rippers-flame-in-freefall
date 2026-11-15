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
