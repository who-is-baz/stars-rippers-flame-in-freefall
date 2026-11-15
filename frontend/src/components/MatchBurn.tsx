import { memo, useEffect, useRef } from 'react';
import type { BurnParams } from '../lib/matchBurn';
import { CYCLE_S } from '../lib/matchBurn';
import { MatchRenderer, REGION } from './matchRender';

/** Canvas illustration of the burning match, placed in the scene (inside the SVG world, so zoom and layout apply to it).
 *  Conceptual illustration: not tied to any data except the state/colour parameters supplied by lib/matchBurn.ts. */
export const MatchBurn = memo(function MatchBurn({ params, scale, oneG, phone, sizeKey, onReady }: {
  params: BurnParams; scale: number; oneG: boolean; phone: boolean; sizeKey: string; onReady: (ok: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ params, scale, oneG });
  live.current = { params, scale, oneG };

  useEffect(() => {
    const cv = ref.current;
    if (!cv || typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) { onReady(false); return; }
    const ctx = cv.getContext('2d');
    if (!ctx) { onReady(false); return; }
    let raf = 0, idle = 0, dead = false, visible = true, last = 0, t0 = performance.now();
    const dprCap = phone ? 1.5 : 2;
    const renderer = new MatchRenderer(ctx, params);
    const size = () => {
      const r = cv.getBoundingClientRect(); const k = Math.min(dprCap, window.devicePixelRatio || 1);
      const w = Math.max(2, Math.min(1600, Math.round(r.width * k))), h = Math.round(w * REGION.h / REGION.w);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      ctx.setTransform(w / REGION.w, 0, 0, w / REGION.w, 0, 0);
    };
    const frame = (now: number) => {
      raf = 0; if (dead) return;
      const { params: p, oneG: g } = live.current;
      if (p.animate && visible && !document.hidden) {
        if (!phone || now - last >= 30) { last = now; renderer.draw(((now - t0) / 1000) % CYCLE_S, g); }
        raf = requestAnimationFrame(frame);
      }
    };
    const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
    const start = () => { if (dead) return; size(); renderer.setParams(live.current.params); renderer.draw(live.current.params.animate ? 0 : 6.5, live.current.oneG); onReady(true); kick(); };
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) idle = ric(start, { timeout: 400 }); else idle = window.setTimeout(start, 50);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((e) => { visible = e[0]?.isIntersecting !== false; if (visible) kick(); }) : null;
    io?.observe(cv);
    const vis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', vis);
    const rs = () => { size(); if (!live.current.params.animate) renderer.draw(6.5, live.current.oneG); };
    window.addEventListener('resize', rs);
    return () => { dead = true; if (raf) cancelAnimationFrame(raf); io?.disconnect(); document.removeEventListener('visibilitychange', vis); window.removeEventListener('resize', rs); onReady(false); void idle; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, phone, sizeKey]);

  return <canvas ref={ref} className="match-burn" data-fx="match-burn" aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }} />;
});

export const MATCH_REGION = REGION;
