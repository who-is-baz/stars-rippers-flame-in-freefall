// Display preferences for low-vision and motion-sensitive visitors: text size and "Pause animations".
// Applied as data attributes on <html> (CSS does the rest) and remembered in localStorage. Storage can fail (private
// mode, blocked site data): the site then simply uses the defaults.
import { useSyncExternalStore } from 'react';

export type TextSize = 'sm' | 'md' | 'lg';
export interface DisplayPrefs { text: TextSize; paused: boolean }

const KEY_TEXT = 'fif.textSize';
const KEY_MOTION = 'fif.motion';
const TEXT_SIZES: readonly TextSize[] = ['sm', 'md', 'lg'];

function read(): DisplayPrefs {
  try {
    const t = window.localStorage.getItem(KEY_TEXT);
    return { text: TEXT_SIZES.find((s) => s === t) ?? 'md', paused: window.localStorage.getItem(KEY_MOTION) === 'paused' };
  } catch { return { text: 'md', paused: false }; }
}

let state: DisplayPrefs = typeof window === 'undefined' ? { text: 'md', paused: false } : read();
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.textSize = state.text;
  if (state.paused) el.dataset.motion = 'paused'; else delete el.dataset.motion;
}
apply();

export function setDisplayPrefs(patch: Partial<DisplayPrefs>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(KEY_TEXT, state.text);
    window.localStorage.setItem(KEY_MOTION, state.paused ? 'paused' : 'on');
  } catch { /* not remembered, still applied */ }
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getDisplayPrefs = () => state;
export const useDisplayPrefs = () => useSyncExternalStore(subscribe, getDisplayPrefs, getDisplayPrefs);
/** True when animations must not run: the OS asks for reduced motion OR the visitor pressed "Pause animations". */
export const animationsPaused = () => state.paused
  || (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
