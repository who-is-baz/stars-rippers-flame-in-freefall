// Side-effect entry (imported once in main.tsx). After the opening intro ends (or right away when there is none), it
// measures the frame rate for 2 s; below 30 fps it adds the `perf-lite` class to <html>, which turns the decorative
// animations off. It measures once per page load and never removes the class by itself.
import { LITE_CLASS, MEASURE_MS, averageFps, perfOverride, shouldGoLite } from './perfMode';

const root = document.documentElement;

function measure(): void {
  const stamps: number[] = [];
  const t0 = performance.now();
  const tick = (t: number) => {
    stamps.push(t);
    if (t - t0 < MEASURE_MS) requestAnimationFrame(tick);
    else if (shouldGoLite(averageFps(stamps)) && !document.hidden) root.classList.add(LITE_CLASS);
  };
  requestAnimationFrame(tick);
}

const mode = perfOverride(window.location.search);
if (mode === 'lite') root.classList.add(LITE_CLASS);
else if (mode !== 'full') {
  // The intro announces its end with this event; without an intro on screen, measure once the page has loaded.
  if (document.getElementById('intro-root')) window.addEventListener('fif:intro-done', measure, { once: true });
  else if (document.readyState === 'complete') measure();
  else window.addEventListener('load', measure, { once: true });
}
