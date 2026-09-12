"use client";

import { useEffect, useRef } from "react";

// A subtle scroll-linked vertical offset, clamped to a small pixel range so
// it reads as depth rather than motion. Mutates the node's style directly
// instead of going through React state -- routing a per-scroll-frame value
// through setState forces the whole component tree under it to re-render
// on every frame, which is what caused this to stutter on mobile. An
// IntersectionObserver also stops the scroll handler from doing any work
// once the element is well outside the viewport, so scrolling past it
// (or through the rest of the page) doesn't keep paying for it. Skips
// entirely for prefers-reduced-motion, matching useReveal's convention of
// never gating content on JS succeeding -- this only ever adds a transform
// on top of an already-visible element.
export function useScrollParallax<T extends HTMLElement>(maxOffsetPx = 24) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    let isNearViewport = true;

    function update() {
      ticking = false;
      if (!isNearViewport || !node) return;
      const rect = node.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distanceFromViewportCenter = elementCenter - window.innerHeight / 2;
      const ratio = Math.max(-1, Math.min(1, distanceFromViewportCenter / window.innerHeight));
      node.style.transform = `translateY(${ratio * maxOffsetPx}px)`;
    }

    function onScrollOrResize() {
      if (!isNearViewport || ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    // A generous margin so the offset is already correct by the time the
    // element scrolls into view, rather than snapping into place.
    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearViewport = entry.isIntersecting;
        if (isNearViewport) onScrollOrResize();
      },
      { rootMargin: "50% 0px" },
    );
    observer.observe(node);

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [maxOffsetPx]);

  return ref;
}
