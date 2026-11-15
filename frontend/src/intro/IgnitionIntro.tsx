// Opening intro: black screen → a match is struck (fails once) → a small flame → a circle of light opens over the real
// interface, whose parts come in one after another. Isolated on purpose: the app does not know it exists.
// Safety exits: Skip button, Esc / Enter, ?intro=off, and a plain timer ends it even if the animation frame loop stalls.
// It only touches transform / opacity / canvas, and it cleans up its frame loop, timers, listeners and AudioContext.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createIntroAudio, type IntroAudio } from './introAudio';
import { drawIntro } from './introCanvas';
import { AUTO_START_MS, REDUCED_FADE_MS, SKIP_FADE_MS, TL, prefersReducedMotion } from './introLogic';
import './intro.css';

type Phase = 'wait' | 'run' | 'out';
const HOLD = 'intro-hold';       // interface parts hidden, waiting for their turn
const REVEAL = 'intro-reveal';   // interface parts coming in, staggered

function lockApp(el: HTMLElement | null | undefined, on: boolean) {
  if (!el) return;
  if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
  else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
}

export function IgnitionIntro({ appRoot, onDone }: { appRoot?: HTMLElement | null; onDone: () => void }) {
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(reduced ? 'out' : 'wait');
  const [outMs, setOutMs] = useState(reduced ? REDUCED_FADE_MS : Math.round((TL.end - TL.fadeStart) * 1000));
  const [drawn, setDrawn] = useState(false);            // the canvas is painting the black itself (so the hole can show the app)
  const canvas = useRef<HTMLCanvasElement>(null);
  const skipBtn = useRef<HTMLButtonElement>(null);
  const audio = useRef<IntroAudio | null>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const started = useRef(false);
  const ended = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const stopLoop = useCallback(() => { if (raf.current) { window.cancelAnimationFrame(raf.current); raf.current = 0; } }, []);
  const htmlClass = useCallback((add: string | null) => {
    const c = document.documentElement.classList;
    c.remove(HOLD, REVEAL);
    if (add) c.add(add);
  }, []);

  // Leave: fade the overlay, give the app back, then tell the host to unmount us.
  const leave = useCallback((ms: number, keepReveal: boolean) => {
    if (ended.current) return;
    ended.current = true;
    if (!keepReveal) htmlClass(null);
    lockApp(appRoot, false);
    setOutMs(ms);
    setPhase('out');
    later(() => { stopLoop(); htmlClass(null); done.current(); }, ms);
  }, [appRoot, htmlClass, later, stopLoop]);

  const skip = useCallback(() => {
    audio.current?.close(); audio.current = null;
    leave(SKIP_FADE_MS, false);
  }, [leave]);

  const start = useCallback((withSound: boolean) => {
    if (started.current || ended.current) return;
    started.current = true;
    if (withSound) audio.current = createIntroAudio();
    const cv = canvas.current;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = cv?.getContext('2d') ?? null; } catch { ctx = null; }
    if (cv && ctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const fit = () => { cv.width = Math.round(window.innerWidth * dpr); cv.height = Math.round(window.innerHeight * dpr); };
      fit();
      const t0 = performance.now();
      const c2 = ctx;
      const frame = (now: number) => {
        if (cv.width !== Math.round(window.innerWidth * dpr) || cv.height !== Math.round(window.innerHeight * dpr)) fit();
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawIntro(c2, window.innerWidth, window.innerHeight, (now - t0) / 1000);
        raf.current = window.requestAnimationFrame(frame);
      };
      frame(t0);                 // first frame is painted before the overlay background goes transparent: no flash
      setDrawn(true);
    }
    setPhase('run');
    later(() => { if (!ended.current) htmlClass(REVEAL); }, TL.uiStart * 1000);
    later(() => leave(Math.round((TL.end - TL.fadeStart) * 1000), true), TL.fadeStart * 1000);
  }, [htmlClass, later, leave]);

  useEffect(() => {
    lockApp(appRoot, true);
    if (reduced) {
      // prefers-reduced-motion: a plain fade and nothing else (no canvas, no sound, no staggered entrance)
      later(() => { lockApp(appRoot, false); done.current(); }, REDUCED_FADE_MS);
    } else {
      htmlClass(HOLD);
      later(() => start(false), AUTO_START_MS);     // nobody clicked: start by itself, silent
      skipBtn.current?.focus({ preventScroll: true });
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', onKey, true);
    const pending = timers.current;
    return () => {
      window.removeEventListener('keydown', onKey, true);
      pending.forEach((id) => window.clearTimeout(id));
      pending.length = 0;
      stopLoop();
      audio.current?.close(); audio.current = null;
      htmlClass(null);
      lockApp(appRoot, false);
    };
    // mount / unmount only: every callback above is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`intro-overlay${phase === 'run' && drawn ? ' is-run' : ''}${phase === 'out' ? ' is-out' : ''}${reduced ? ' is-reduced' : ''}`}
      style={{ '--intro-out-ms': `${outMs}ms` } as CSSProperties}
      role="dialog" aria-modal="true" aria-label="Opening animation"
      data-phase={phase}
      onClick={() => { if (phase === 'wait') start(true); }}
    >
      {!reduced && <canvas ref={canvas} aria-hidden="true" />}
      {!reduced && phase === 'wait' && <p className="intro-hint">Click to ignite</p>}
      {!reduced && (
        <button ref={skipBtn} type="button" className="intro-skip" onClick={(e) => { e.stopPropagation(); skip(); }}>
          Skip <span aria-hidden="true">Esc</span>
        </button>
      )}
    </div>
  );
}
