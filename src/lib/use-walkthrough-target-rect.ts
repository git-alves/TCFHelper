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

    let hasScrolledIntoView = false;

    function measure() {
      const element = targetId ? document.querySelector<HTMLElement>(`[data-walkthrough="${targetId}"]`) : null;
      if (!element) {
        setRect(null);
        return;
      }

      if (!hasScrolledIntoView) {
        hasScrolledIntoView = true;
        // Not "smooth": an animated scroll doesn't finish before the
        // getBoundingClientRect() call below runs, so the very first
        // measurement after scrolling would still reflect the pre-scroll
        // position -- and clicking through steps faster than the animation
        // settles (easy to do by the later, more familiar steps) leaves the
        // previous step's scroll still running when this one starts,
        // fighting it for the final position. "auto" jumps immediately, so
        // the measurement taken right after is always accurate and there is
        // never more than one scroll in flight.
        element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      }

      const domRect = element.getBoundingClientRect();
      // Bails out of the setState when nothing actually moved, since the
      // observer below can fire on every unrelated DOM change on the page
      // for as long as this step is open.
      setRect((previous) => {
        if (
          previous &&
          previous.top === domRect.top &&
          previous.left === domRect.left &&
          previous.width === domRect.width &&
          previous.height === domRect.height
        ) {
          return previous;
        }
        return { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height };
      });
    }

    measure();

    // Kept running for the whole step, not just until the target is first
    // found: a scripted tour step (see WritingWorkspace's
    // applyWalkthroughStep) can change its own target's surrounding layout
    // -- or make the target itself appear asynchronously -- after targetId
    // has already stopped changing, which nothing else here would notice.
    // childList/subtree only fires on nodes being added or removed, not on
    // this component's own inline-style updates below, so this cannot loop.
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", measure);
    // Capture phase: a target can sit inside a scrollable ancestor other
    // than the window (e.g. a long form), and only capture-phase listening
    // catches that scroll at all.
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [targetId]);

  // Masks a stale rect from a previous targetId during the render that
  // follows targetId becoming null, rather than clearing it with an extra
  // setState call inside the effect above.
  return targetId ? rect : null;
}
