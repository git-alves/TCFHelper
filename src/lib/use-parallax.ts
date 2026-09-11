"use client";

import { useEffect, useRef, useState } from "react";

// A subtle scroll-linked vertical offset, clamped to a small pixel range so
// it reads as depth rather than motion. Skips entirely for
// prefers-reduced-motion, matching useReveal's convention of never gating
// content on JS succeeding -- this only ever adds a transform on top of an
// already-visible element.
export function useScrollParallax<T extends HTMLElement>(maxOffsetPx = 24) {
  const ref = useRef<T>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    function update() {
      frame = 0;
      const rect = node!.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distanceFromViewportCenter = elementCenter - window.innerHeight / 2;
      const ratio = Math.max(-1, Math.min(1, distanceFromViewportCenter / window.innerHeight));
      setOffset(ratio * maxOffsetPx);
    }

    function onScrollOrResize() {
      if (frame) return;
      frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [maxOffsetPx]);

  return { ref, offset };
}
