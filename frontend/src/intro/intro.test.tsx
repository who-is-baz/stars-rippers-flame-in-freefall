// Opening intro: it can always be skipped, ?intro=off never shows it, it plays once per session, reduced motion gets a
// plain fade, sound only after a click, and it gives the app back (inert / aria-hidden / timers / AudioContext) when it ends.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IgnitionIntro } from './IgnitionIntro';
import { mountIntro } from './mount';
import { AUTO_START_MS, REDUCED_FADE_MS, SESSION_KEY, SKIP_FADE_MS, TL, markIntroSeen, shouldShowIntro } from './introLogic';

const END_MS = TL.end * 1000;
let app: HTMLElement;
let audioMade = 0;
let audioClosed = 0;

function fakeAudio() {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), type: '', buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() });
  class FakeAudioContext {
    currentTime = 0; sampleRate = 100; destination = {};
    constructor() { audioMade += 1; }
    resume() { return Promise.resolve(); }
    close() { audioClosed += 1; return Promise.resolve(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createOscillator() { return node(); }
    createBufferSource() { return node(); }
    createBuffer(_c: number, n: number) { return { getChannelData: () => new Float32Array(n) }; }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
}
const reducedMotion = (on: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && /reduce/.test(q), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  audioMade = 0; audioClosed = 0;
  fakeAudio();
  reducedMotion(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); // jsdom has no canvas: the intro must still end
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  app = document.createElement('div');
  app.id = 'root';
  document.body.appendChild(app);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  app.remove();
  document.getElementById('intro-root')?.remove();
  document.documentElement.classList.remove('intro-hold', 'intro-reveal');
});

describe('shouldShowIntro', () => {
  it('?intro=off never shows it, ?intro=on always does, otherwise once per session', () => {
    expect(shouldShowIntro('?intro=off', window.sessionStorage)).toBe(false);
    expect(shouldShowIntro('', window.sessionStorage)).toBe(true);
    markIntroSeen(window.sessionStorage);
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBe('1');
    expect(shouldShowIntro('', window.sessionStorage)).toBe(false);
    expect(shouldShowIntro('?intro=on', window.sessionStorage)).toBe(true);
    expect(shouldShowIntro('?x=1&intro=off', null)).toBe(false);
  });
  it('blocked storage does not break it', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(shouldShowIntro('', broken)).toBe(true);
    expect(() => markIntroSeen(broken)).not.toThrow();
    expect(shouldShowIntro('', null)).toBe(true);
  });
});

describe('IgnitionIntro', () => {
  it('locks the app while it runs and can be skipped with the Skip button', () => {
    const onDone = vi.fn();
    render(<IgnitionIntro appRoot={app} onDone={onDone} />);
    expect(app).toHaveAttribute('inert');
    expect(app).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Click to ignite')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('intro-hold');
    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    expect(app).not.toHaveAttribute('inert');
    expect(app).not.toHaveAttribute('aria-hidden');
    expect(document.documentElement).not.toHaveClass('intro-hold');
    tick(SKIP_FADE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    tick(END_MS + AUTO_START_MS);                       // nothing else fires afterwards
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(audioMade).toBe(0);
  });

  it.each(['Escape', 'Enter'])('%s skips it too', (key) => {
    const onDone = vi.fn();
    render(<IgnitionIntro appRoot={app} onDone={onDone} />);
    fireEvent.keyDown(window, { key });
    tick(SKIP_FADE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(app).not.toHaveAttribute('inert');
  });

  it('without a click it starts by itself after 2 s, with no sound, and ends on its own', () => {
    const onDone = vi.fn();
    render(<IgnitionIntro appRoot={app} onDone={onDone} />);
    tick(AUTO_START_MS - 1);
    expect(screen.getByRole('dialog', { name: 'Opening animation' })).toHaveAttribute('data-phase', 'wait');
    tick(1);
    expect(screen.getByRole('dialog', { name: 'Opening animation' })).toHaveAttribute('data-phase', 'run');
    expect(screen.queryByText('Click to ignite')).toBeNull();
    expect(audioMade).toBe(0);
    tick(TL.uiStart * 1000);
    expect(document.documentElement).toHaveClass('intro-reveal');   // interface parts come in, staggered
    tick(END_MS - TL.uiStart * 1000);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(document.documentElement).not.toHaveClass('intro-reveal');
    expect(app).not.toHaveAttribute('inert');
    expect(audioMade).toBe(0);
  });

  it('a click ignites it with synthesised sound, and the AudioContext is closed on unmount', () => {
    const onDone = vi.fn();
    const r = render(<IgnitionIntro appRoot={app} onDone={onDone} />);
    fireEvent.click(screen.getByRole('dialog', { name: 'Opening animation' }));
    expect(audioMade).toBe(1);
    expect(screen.getByRole('dialog', { name: 'Opening animation' })).toHaveAttribute('data-phase', 'run');
    tick(AUTO_START_MS);                                 // the auto-start timer does not start it twice
    expect(audioMade).toBe(1);
    r.unmount();
    expect(audioClosed).toBe(1);
    expect(app).not.toHaveAttribute('inert');
    expect(document.documentElement).not.toHaveClass('intro-hold');
    tick(END_MS);
    expect(onDone).not.toHaveBeenCalled();               // timers were cleared with the component
  });

  it('prefers-reduced-motion: only a 300 ms fade (no canvas, no hint, no sound, no staggered entrance)', () => {
    reducedMotion(true);
    const onDone = vi.fn();
    render(<IgnitionIntro appRoot={app} onDone={onDone} />);
    const dlg = screen.getByRole('dialog', { name: 'Opening animation' });
    expect(dlg).toHaveClass('is-out', 'is-reduced');
    expect(dlg.querySelector('canvas')).toBeNull();
    expect(screen.queryByText('Click to ignite')).toBeNull();
    expect(document.documentElement).not.toHaveClass('intro-hold');
    tick(REDUCED_FADE_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    tick(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(app).not.toHaveAttribute('inert');
    tick(END_MS + AUTO_START_MS);
    expect(audioMade).toBe(0);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('mountIntro', () => {
  it('?intro=off does not show it', () => {
    window.history.replaceState(null, '', '/?intro=off');
    let shown = true;
    act(() => { shown = mountIntro(app); });
    expect(shown).toBe(false);
    expect(document.getElementById('intro-root')).toBeNull();
    expect(app).not.toHaveAttribute('inert');
  });

  it('shows once per session, removes itself when skipped, and ?intro=on forces it again', () => {
    let shown = false;
    act(() => { shown = mountIntro(app); });
    expect(shown).toBe(true);
    expect(document.getElementById('intro-root')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    tick(SKIP_FADE_MS);
    expect(document.getElementById('intro-root')).toBeNull();
    expect(app).not.toHaveAttribute('inert');

    act(() => { shown = mountIntro(app); });               // same session: not again
    expect(shown).toBe(false);
    expect(document.getElementById('intro-root')).toBeNull();

    window.history.replaceState(null, '', '/?intro=on');
    act(() => { shown = mountIntro(app); });
    expect(shown).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    tick(SKIP_FADE_MS);
    expect(document.getElementById('intro-root')).toBeNull();
  });
});
