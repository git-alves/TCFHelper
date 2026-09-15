// @vitest-environment happy-dom
//
// Regression coverage: useScrollParallax used to construct
// IntersectionObserver unconditionally, so mounting the hero without that
// API available would throw during the effect instead of degrading to a
// static (non-parallaxed, still fully visible) element.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollParallax } from "./use-parallax";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function Harness() {
  const ref = useScrollParallax<HTMLDivElement>();
  return <div ref={ref} />;
}

describe("useScrollParallax", () => {
  it("does not throw when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    expect(() => {
      act(() => {
        root.render(<Harness />);
      });
    }).not.toThrow();
  });

  it("still mounts normally when IntersectionObserver is available", () => {
    expect(() => {
      act(() => {
        root.render(<Harness />);
      });
    }).not.toThrow();
  });
});
