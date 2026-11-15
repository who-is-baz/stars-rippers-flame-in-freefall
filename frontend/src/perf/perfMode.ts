// Automatic light mode: decoration only (star twinkle and drift, shooting stars, oxygen particles). It never changes
// any data or any figure. ?perf=lite forces it, ?perf=full turns the detection off. Pure logic, tested.
export const LITE_CLASS = 'perf-lite';
export const MEASURE_MS = 2000;
export const MIN_FPS = 30;

export type PerfOverride = 'lite' | 'full' | null;
export function perfOverride(search: string): PerfOverride {
  const v = new URLSearchParams(search).get('perf');
  return v === 'lite' || v === 'full' ? v : null;
}

/** Average frames per second from requestAnimationFrame timestamps (ms). Null when there are too few frames to say. */
export function averageFps(stamps: number[]): number | null {
  if (stamps.length < 2) return null;
  const span = stamps[stamps.length - 1] - stamps[0];
  return span > 0 ? ((stamps.length - 1) * 1000) / span : null;
}

/** Decision: go light only when the measured average is below the threshold. No measurement → keep the full look. */
export function shouldGoLite(fps: number | null, min = MIN_FPS): boolean {
  return fps != null && fps < min;
}
