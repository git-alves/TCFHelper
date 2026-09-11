"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-triggered fade/slide-in for an otherwise static landing page.
// Reduced-motion visitors and anyone whose IntersectionObserver never fires
// (SSR, older browsers) still get the content -- this only ever adds a
// starting hidden state, it never gates visibility on JS succeeding.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    function reveal() {
      setVisible(true);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
