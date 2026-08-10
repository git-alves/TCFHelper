// Pure geometry only -- no DOM access -- so this stays unit-testable in a
// repo with no jsdom/testing-library. The DOM-dependent half (measuring a
// real target element and re-measuring on resize/scroll) lives in
// use-walkthrough-target-rect.ts instead.

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipPosition {
  placement: TooltipPlacement;
  top: number;
  left: number;
}

const TOOLTIP_GAP = 12;
// A fixed estimate, not a measurement of the real tooltip: this keeps
// placement decisions synchronous and available on the very first paint,
// before the tooltip itself has ever been laid out to measure. The
// component that renders the tooltip caps its actual size to match these
// same constants, so the estimate never meaningfully diverges from reality.
export const TOOLTIP_WIDTH = 320;
export const TOOLTIP_HEIGHT = 170;
const VIEWPORT_MARGIN = 16;

/**
 * Picks which side of `target` the tooltip should render on, preferring
 * `preferred` but falling back through the other three sides in order of
 * how much room the viewport actually offers, then clamps the result so the
 * tooltip is never partially off-screen even when the target itself is near
 * an edge.
 */
export function computeTooltipPosition(
  target: Rect,
  viewport: Viewport,
  preferred: TooltipPlacement = "bottom",
): TooltipPosition {
  const space = {
    top: target.top,
    bottom: viewport.height - (target.top + target.height),
    left: target.left,
    right: viewport.width - (target.left + target.width),
  };

  const fits: Record<TooltipPlacement, boolean> = {
    top: space.top >= TOOLTIP_HEIGHT + TOOLTIP_GAP,
    bottom: space.bottom >= TOOLTIP_HEIGHT + TOOLTIP_GAP,
    left: space.left >= TOOLTIP_WIDTH + TOOLTIP_GAP,
    right: space.right >= TOOLTIP_WIDTH + TOOLTIP_GAP,
  };

  const candidateOrder = Array.from(
    new Set<TooltipPlacement>([preferred, "bottom", "top", "right", "left"]),
  );
  const placement = candidateOrder.find((candidate) => fits[candidate]) ?? "bottom";

  let top: number;
  let left: number;
  if (placement === "top" || placement === "bottom") {
    top = placement === "top" ? target.top - TOOLTIP_GAP - TOOLTIP_HEIGHT : target.top + target.height + TOOLTIP_GAP;
    left = target.left + target.width / 2 - TOOLTIP_WIDTH / 2;
  } else {
    left = placement === "left" ? target.left - TOOLTIP_GAP - TOOLTIP_WIDTH : target.left + target.width + TOOLTIP_GAP;
    top = target.top + target.height / 2 - TOOLTIP_HEIGHT / 2;
  }

  const maxLeft = Math.max(VIEWPORT_MARGIN, viewport.width - TOOLTIP_WIDTH - VIEWPORT_MARGIN);
  const maxTop = Math.max(VIEWPORT_MARGIN, viewport.height - TOOLTIP_HEIGHT - VIEWPORT_MARGIN);
  left = Math.min(Math.max(left, VIEWPORT_MARGIN), maxLeft);
  top = Math.min(Math.max(top, VIEWPORT_MARGIN), maxTop);

  return { placement, top, left };
}
