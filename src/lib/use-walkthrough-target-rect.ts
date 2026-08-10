"use client";

import { useLayoutEffect, useState } from "react";
import type { Rect } from "@/lib/walkthrough-position";

// DOM-dependent (real element measurement, resize/scroll tracking), so it
// isn't unit-testable in this repo (no jsdom/testing-library installed) --
// the pure math it feeds into (walkthrough-position.ts) is what carries the
// test coverage instead.
export function useWalkthroughTargetRect(targetId: string | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  // Layout, not passive: measuring after paint would show one frame of the
  // previous step's rect (or none) before snapping to the new target,
  // instead of both changing together.
  useLayoutEffect(() => {
    if (!targetId) return;

    function measure() {
      const element = targetId ? document.querySelector<HTMLElement>(`[data-walkthrough="${targetId}"]`) : null;
      if (!element) {
        setRect(null);
        return;
      }

      const domRect = element.getBoundingClientRect();
      setRect({ top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height });
    }

    measure();
    window.addEventListener("resize", measure);
    // Capture phase: a target can sit inside a scrollable ancestor other
    // than the window (e.g. a long form), and only capture-phase listening
    // catches that scroll at all.
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [targetId]);

  // Masks a stale rect from a previous targetId during the render that
  // follows targetId becoming null, rather than clearing it with an extra
  // setState call inside the effect above.
  return targetId ? rect : null;
}
