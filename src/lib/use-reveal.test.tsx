// @vitest-environment happy-dom
//
// Regression coverage for the two landing-page reveal bugs flagged in
// review: a missing IntersectionObserver used to leave a section hidden
// forever (it should reveal immediately, same as reduced motion), and
// reduced-motion visitors should never see it later reveal at all -- both
// contradicted this hook's own "never gates visibility on JS succeeding"
// comment before the fix.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReveal } from "./use-reveal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function mockMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion") && reducedMotion,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mockMatchMedia(false);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function Harness({ capture }: { capture: (visible: boolean) => void }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  capture(visible);
  return <div ref={ref} />;
}

describe("useReveal", () => {
  it("reveals immediately when IntersectionObserver is unavailable, instead of staying hidden forever", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    let visible = false;
    act(() => {
      root.render(<Harness capture={(value) => (visible = value)} />);
    });

    expect(visible).toBe(true);
  });

  it("reveals immediately for prefers-reduced-motion, without ever constructing an observer", () => {
    mockMatchMedia(true);
    const ObserverSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ObserverSpy);

    let visible = false;
    act(() => {
      root.render(<Harness capture={(value) => (visible = value)} />);
    });

    expect(visible).toBe(true);
    expect(ObserverSpy).not.toHaveBeenCalled();
  });

  it("starts hidden and waits for a real observer when both are available", () => {
    let visible = true;
    act(() => {
      root.render(<Harness capture={(value) => (visible = value)} />);
    });

    // Real support, no reduced motion, and nothing has intersected yet --
    // this is the only case that's still supposed to start hidden.
    expect(visible).toBe(false);
  });
});
