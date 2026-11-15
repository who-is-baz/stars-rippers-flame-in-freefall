// Opening intro: when to show it and its timeline. Pure logic (no DOM), so it is easy to test.
export const SESSION_KEY = 'fif.intro.seen';

// ?intro=on forces it, ?intro=off disables it, otherwise once per browser session.
// `storage` is null when sessionStorage is blocked (private mode): the intro still plays, it just cannot remember.
export function shouldShowIntro(search: string, storage: Pick<Storage, 'getItem'> | null): boolean {
  const flag = new URLSearchParams(search).get('intro');
  if (flag === 'off') return false;
  if (flag === 'on') return true;
  try { return storage?.getItem(SESSION_KEY) !== '1'; } catch { return true; }
}
export function markIntroSeen(storage: Pick<Storage, 'setItem'> | null): void {
  try { storage?.setItem(SESSION_KEY, '1'); } catch { /* blocked storage: play again next load */ }
}

export const prefersReducedMotion = (): boolean => {
  try { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// Timeline in seconds from the moment the match is struck. Total: 3.3 s.
export const TL = {
  strike1: 0.12,      // first scrape: sparks only, it fails
  strike2: 0.62,      // second scrape
  ignite: 0.92,       // the head catches: small flame in the centre
  revealStart: 1.5,   // the flame grows and the circle of light starts to open
  uiStart: 1.75,      // interface elements start to come in, one after another
  revealEnd: 2.75,    // the circle covers the whole screen
  fadeStart: 2.8,     // the overlay fades away
  end: 3.3,
} as const;
export const STRIKE_LEN = 0.3;          // seconds each scrape lasts
export const AUTO_START_MS = 2000;      // no click after this: it starts by itself, without sound
export const REDUCED_FADE_MS = 300;     // prefers-reduced-motion: a plain fade, nothing else
export const SKIP_FADE_MS = 180;
