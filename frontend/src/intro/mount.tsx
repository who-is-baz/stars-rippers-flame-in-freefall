// Mounts the opening intro in its own DOM node and React root, over the app. The app keeps loading its data underneath.
import { createRoot } from 'react-dom/client';
import { IgnitionIntro } from './IgnitionIntro';
import { markIntroSeen, shouldShowIntro } from './introLogic';

export function mountIntro(appRoot: HTMLElement | null = document.getElementById('root')): boolean {
  let storage: Storage | null = null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  if (!shouldShowIntro(window.location.search, storage)) return false;
  markIntroSeen(storage);
  const host = document.createElement('div');
  host.id = 'intro-root';
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<IgnitionIntro appRoot={appRoot} onDone={() => { root.unmount(); host.remove(); }} />);
  return true;
}
