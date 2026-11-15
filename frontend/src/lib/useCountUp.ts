// Animates a number from its previous value to a new one (about 0.5 s). The first render shows the real value
// immediately, so nothing ever starts at a made-up 0. Reduced motion: jumps straight to the value.
import { useEffect, useRef, useState } from 'react';
import { animationsPaused } from './displayPrefs';

export function useCountUp(value: number, ms = 520): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce = animationsPaused();
    if (reduce || from.current === value) { from.current = value; setShown(value); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, ms]);
  return shown;
}
