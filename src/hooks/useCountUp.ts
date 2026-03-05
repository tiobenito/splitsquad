import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from its previous value to a new target using
 * requestAnimationFrame with ease-out cubic easing.
 *
 * CRITICAL: Initialize to `target` (not 0) — prevents count-from-zero animation on mount.
 *
 * @param target   - The target value to animate toward
 * @param duration - Animation duration in ms (default: 400)
 * @returns Current animated value (integer, rounds during animation)
 */
export function useCountUp(target: number, duration = 400): number {
  const [current, setCurrent] = useState(target); // Initialize to target, NOT 0 — prevents count-from-zero on mount
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}
