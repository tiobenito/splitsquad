import { useRef, useLayoutEffect, useCallback } from 'react';

/**
 * useFLIP — FLIP (First, Last, Invert, Play) animation hook for list reordering.
 *
 * How it works:
 * - Stores element refs and their previous DOMRect positions by key
 * - On each layout effect: compares previous positions (First) to current positions (Last)
 * - Inverts: applies translateY(deltaY) with transition:0 to snap element to old position
 * - Plays: removes the translate in a double-rAF so CSS transition animates to new position
 * - At the end of each effect cycle, captures new positions as the next "First"
 *
 * Usage:
 *   const { setRef } = useFLIP();
 *   // Apply to each list item using a callback ref:
 *   <div ref={setRef(item.id)}>...</div>
 *
 * Per research Pattern 4 and Pitfall 2: capture happens at end of useLayoutEffect,
 * eliminating the need for callers to manually call capturePositions() before re-sorts.
 */
export function useFLIP() {
  // Map of key -> DOM element
  const refsMap = useRef<Map<string, HTMLElement>>(new Map());
  // Map of key -> last known DOMRect (the "First" for next render)
  const prevRectsMap = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const refs = refsMap.current;
    const prevRects = prevRectsMap.current;

    // Collect current (Last) positions for all tracked elements
    const currentRects = new Map<string, DOMRect>();
    refs.forEach((el, key) => {
      currentRects.set(key, el.getBoundingClientRect());
    });

    // For each element that has a previous position, compute and apply inversion
    refs.forEach((el, key) => {
      const prev = prevRects.get(key);
      const curr = currentRects.get(key);
      if (!prev || !curr) return;

      const deltaY = prev.top - curr.top;
      const deltaX = prev.left - curr.left;

      // No movement — skip
      if (Math.abs(deltaY) < 1 && Math.abs(deltaX) < 1) return;

      // INVERT: snap element back to previous position instantly
      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      el.style.transition = 'transform 0s';

      // PLAY: double-rAF ensures browser has committed the inverted position
      // before we start the forward transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transform = '';
          el.style.transition = 'transform 300ms ease-out';
        });
      });
    });

    // Capture new positions as "First" for the next render cycle
    currentRects.forEach((rect, key) => {
      prevRectsMap.current.set(key, rect);
    });
  });

  /**
   * Returns a callback ref for a given key.
   * Call this in the JSX ref prop: ref={setRef(item.id)}
   * Stable identity per key — each call creates a new function but React reconciles
   * callback refs correctly (calls old with null, calls new with element).
   */
  const setRef = useCallback((key: string) => {
    return (el: HTMLElement | null) => {
      if (el) {
        refsMap.current.set(key, el);
      } else {
        refsMap.current.delete(key);
        prevRectsMap.current.delete(key);
      }
    };
  }, []);

  return { setRef };
}
