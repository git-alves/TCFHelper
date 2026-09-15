"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-triggered fade/slide-in for an otherwise static landing page. Only
// ever drives the *reveal*, never the hidden starting state: `visible`
// defaults to false here, but the actual hidden styling in globals.css is
// gated behind a class reveal-init-script.ts's blocking pre-paint script
// adds -- and only once it has confirmed IntersectionObserver exists. A
// no-JS visitor, a failed hydration, or a browser missing that API never
// gets that class, so this hook's `visible` value ends up unused visually
// for them; the content just renders normally. See home-hero.tsx's
// revealProps for how `visible` maps to the data attributes globals.css
// keys off.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    function reveal() {
      setVisible(true);
    }

    // Reduced motion is handled in CSS (see globals.css), not here, so it
    // keeps working if the OS preference changes while the page is open --
    // but there's no CSS equivalent for "IntersectionObserver doesn't
    // exist", so that part still has to be a JS check: without it, a bare
    // `new IntersectionObserver` below would throw instead of just leaving
    // `visible` at its already-safe default.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        reveal();
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}
