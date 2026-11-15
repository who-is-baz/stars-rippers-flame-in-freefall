// Intro sound, synthesised with the Web Audio API (no audio files): filtered noise for each scrape of the match
// and a low "whoosh" when it lights. Only created after a user click (browsers block audio without a gesture).
import { STRIKE_LEN, TL } from './introLogic';

export interface IntroAudio { close: () => void }

type ACtor = typeof AudioContext;

export function createIntroAudio(): IntroAudio | null {
  const AC: ACtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
  if (!AC) return null;
  try {
    const ctx = new AC();
    void ctx.resume?.();
    const t0 = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // one second of white noise, reused by every sound
    const len = Math.floor(ctx.sampleRate);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const noise = (at: number, dur: number) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.start(at); src.stop(at + dur + 0.05);
      return src;
    };

    // scrape: band-passed noise sweeping upward, short and dry
    const scrape = (at: number, level: number) => {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(2200, at);
      f.frequency.exponentialRampToValueAtTime(5200, at + STRIKE_LEN);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level, at + 0.03);
      g.gain.exponentialRampToValueAtTime(level * 0.6, at + STRIKE_LEN * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, at + STRIKE_LEN);
      noise(at, STRIKE_LEN).connect(f); f.connect(g); g.connect(master);
    };
    scrape(t0 + TL.strike1, 0.22);
    scrape(t0 + TL.strike2, 0.3);

    // whoosh: low-passed noise that opens and closes, plus a short low thump
    const at = t0 + TL.ignite;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(160, at);
    lp.frequency.exponentialRampToValueAtTime(950, at + 0.35);
    lp.frequency.exponentialRampToValueAtTime(140, at + 1.7);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, at);
    wg.gain.exponentialRampToValueAtTime(0.7, at + 0.22);
    wg.gain.exponentialRampToValueAtTime(0.25, at + 0.9);
    wg.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
    noise(at, 1.8).connect(lp); lp.connect(wg); wg.connect(master);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(78, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.6);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, at);
    og.gain.exponentialRampToValueAtTime(0.5, at + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
    osc.connect(og); og.connect(master);
    osc.start(at); osc.stop(at + 0.75);

    return { close: () => { try { void ctx.close(); } catch { /* already closed */ } } };
  } catch {
    return null; // no audio is fine: the intro is visual first
  }
}
