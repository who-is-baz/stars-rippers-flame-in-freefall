import { describe, expect, it } from 'vitest';
import { MIN_FPS, averageFps, perfOverride, shouldGoLite } from './perfMode';

describe('light mode decision', () => {
  it('reads ?perf=lite and ?perf=full; anything else means "measure"', () => {
    expect(perfOverride('?perf=lite')).toBe('lite');
    expect(perfOverride('?intro=off&perf=full')).toBe('full');
    expect(perfOverride('?perf=fast')).toBeNull();
    expect(perfOverride('')).toBeNull();
  });
  it('averages frames per second from rAF timestamps', () => {
    const at60 = Array.from({ length: 121 }, (_, i) => i * (1000 / 60));
    expect(averageFps(at60)).toBeCloseTo(60, 5);
    const at20 = Array.from({ length: 41 }, (_, i) => i * 50);
    expect(averageFps(at20)).toBeCloseTo(20, 5);
    expect(averageFps([5])).toBeNull();
    expect(averageFps([])).toBeNull();
  });
  it('goes light only below 30 fps, never without a measurement', () => {
    expect(MIN_FPS).toBe(30);
    expect(shouldGoLite(20)).toBe(true);
    expect(shouldGoLite(29.9)).toBe(true);
    expect(shouldGoLite(30)).toBe(false);
    expect(shouldGoLite(58)).toBe(false);
    expect(shouldGoLite(null)).toBe(false);
  });
});
