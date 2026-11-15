// Mounts the opening intro in its own DOM node and React root, over the app. The app keeps loading its data underneath.
// One intro at a time: a second call while one is on screen does nothing (no duplicates, e.g. with React StrictMode).
// While it is on screen, <html> carries `intro-active` (the app's decorative animations pause); when it ends, the class
// is removed and the window receives `fif:intro-done`.
import { createRoot } from 'react-dom/client';
import { IgnitionIntro } from './IgnitionIntro';
import { shouldShowIntro } from './introLogic';

export const INTRO_ACTIVE = 'intro-active';
export const INTRO_DONE_EVENT = 'fif:intro-done';

export function mountIntro(appRoot: HTMLElement | null = document.getElementById('root')): boolean {
  if (!shouldShowIntro(window.location.search)) return false;
  if (document.getElementById('intro-root')) return false;
  const host = document.createElement('div');
  host.id = 'intro-root';
  document.body.appendChild(host);
  document.documentElement.classList.add(INTRO_ACTIVE);
  const root = createRoot(host);
  root.render(<IgnitionIntro appRoot={appRoot} onDone={() => {
    root.unmount();
    host.remove();
    document.documentElement.classList.remove(INTRO_ACTIVE);
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
  }} />);
  return true;
}

// A page restored from the back/forward cache does not run the scripts again: replay the intro on that event too.
export function onPageShow(e: PageTransitionEvent): void {
  if (e.persisted) mountIntro();
}
