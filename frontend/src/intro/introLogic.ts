// Opening intro: when to show it and its timeline. Pure logic (no DOM), so it is easy to test.
// It plays on EVERY full page load (open the link, reload, reopen the tab, back/forward cache restore). Changing views
// inside the app does not reload the page, so it does not play again. ?intro=off disables it; ?intro=on is accepted too.
export function shouldShowIntro(search: string): boolean {
  return new URLSearchParams(search).get('intro') !== 'off';
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
