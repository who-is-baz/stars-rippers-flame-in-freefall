// Display preferences for low-vision and motion-sensitive visitors: theme (Dark / Light), higher contrast, text size
// and "Pause animations". Applied as data attributes on <html> (CSS does the rest) and remembered in localStorage.
// Storage can fail (private mode, blocked site data): the site then uses the defaults (Dark, normal text, animated).
// index.html applies the saved theme before the first paint with the same keys, so there is no flash.
import { useSyncExternalStore } from 'react';

export type TextSize = 'sm' | 'md' | 'lg';
export type Theme = 'dark' | 'light';
export interface DisplayPrefs { text: TextSize; paused: boolean; theme: Theme; contrast: boolean }

const KEY_TEXT = 'fif.textSize';
const KEY_MOTION = 'fif.motion';
const KEY_THEME = 'fif.theme';
const KEY_CONTRAST = 'fif.contrast';
const TEXT_SIZES: readonly TextSize[] = ['sm', 'md', 'lg'];
export const THEME_COLOR: Record<Theme, string> = { dark: '#040506', light: '#ECEEF1' };
const DEFAULTS: DisplayPrefs = { text: 'md', paused: false, theme: 'dark', contrast: false };

const media = (q: string) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches;

// ?theme=light|dark in the address (a demo link) wins over the saved choice for that visit; it is not saved.
const urlTheme = (): Theme | null => { try { const m = /[?&]theme=(dark|light)\b/.exec(window.location.search); return m ? (m[1] as Theme) : null; } catch { return null; } };

function read(): DisplayPrefs {
  try {
    const ls = window.localStorage;
    const t = ls.getItem(KEY_TEXT);
    const c = ls.getItem(KEY_CONTRAST);
    return {
      text: TEXT_SIZES.find((s) => s === t) ?? 'md',
      paused: ls.getItem(KEY_MOTION) === 'paused',
      theme: urlTheme() ?? (ls.getItem(KEY_THEME) === 'light' ? 'light' : 'dark'),
      contrast: c === null ? media('(prefers-contrast: more)') : c === 'more',
    };
  } catch { return { ...DEFAULTS, theme: urlTheme() ?? 'dark', contrast: media('(prefers-contrast: more)') }; }
}

let state: DisplayPrefs = typeof window === 'undefined' ? DEFAULTS : read();
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.textSize = state.text;
  el.dataset.theme = state.theme;
  if (state.paused) el.dataset.motion = 'paused'; else delete el.dataset.motion;
  if (state.contrast) el.dataset.contrast = 'more'; else delete el.dataset.contrast;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[state.theme]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', state.theme);
}
apply();

export function setDisplayPrefs(patch: Partial<DisplayPrefs>) {
  state = { ...state, ...patch };
  try {
    const ls = window.localStorage;
    ls.setItem(KEY_TEXT, state.text);
    ls.setItem(KEY_MOTION, state.paused ? 'paused' : 'on');
    ls.setItem(KEY_THEME, state.theme);
    if ('contrast' in patch) ls.setItem(KEY_CONTRAST, state.contrast ? 'more' : 'normal');
  } catch { /* not remembered, still applied */ }
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getDisplayPrefs = () => state;
export const useDisplayPrefs = () => useSyncExternalStore(subscribe, getDisplayPrefs, getDisplayPrefs);
/** True when animations must not run: the OS asks for reduced motion OR the visitor pressed "Pause animations". */
export const animationsPaused = () => state.paused || media('(prefers-reduced-motion: reduce)');
