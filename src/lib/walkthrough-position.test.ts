import { describe, expect, it } from "vitest";
import { computeTooltipPosition, TOOLTIP_HEIGHT, TOOLTIP_WIDTH } from "./walkthrough-position";

const viewport = { width: 1280, height: 800 };

describe("computeTooltipPosition", () => {
  it("places the tooltip below the target when there is room and bottom is preferred", () => {
    const target = { top: 100, left: 500, width: 120, height: 40 };

    const position = computeTooltipPosition(target, viewport, "bottom");

    expect(position.placement).toBe("bottom");
    expect(position.top).toBeGreaterThan(target.top + target.height);
  });

  it("centers the tooltip horizontally on the target when placed above or below", () => {
    const target = { top: 400, left: 500, width: 120, height: 40 };

    const position = computeTooltipPosition(target, viewport, "bottom");

    expect(position.left).toBeCloseTo(target.left + target.width / 2 - TOOLTIP_WIDTH / 2, 0);
  });

  it("falls back to top when the target is near the bottom of the viewport", () => {
    const target = { top: viewport.height - 60, left: 500, width: 120, height: 40 };

    const position = computeTooltipPosition(target, viewport, "bottom");

    expect(position.placement).toBe("top");
    expect(position.top).toBeLessThan(target.top);
  });

  it("falls back to right when neither top nor bottom fits and the preferred side is top", () => {
    // A short, wide viewport where the target spans nearly the full height,
    // so there's no room above or below it, but plenty to the side.
    const shortViewport = { width: 1280, height: TOOLTIP_HEIGHT };
    const target = { top: 0, left: 500, width: 120, height: TOOLTIP_HEIGHT };

    const position = computeTooltipPosition(target, shortViewport, "top");

    expect(position.placement).toBe("right");
  });

  it("clamps the tooltip within the viewport when the target is against the left edge", () => {
    const target = { top: 400, left: 0, width: 40, height: 40 };

    const position = computeTooltipPosition(target, viewport, "left");

    expect(position.left).toBeGreaterThanOrEqual(0);
  });

  it("clamps the tooltip within the viewport when the target is against the right edge", () => {
    const target = { top: 400, left: viewport.width - 40, width: 40, height: 40 };

    const position = computeTooltipPosition(target, viewport, "right");

    expect(position.left + TOOLTIP_WIDTH).toBeLessThanOrEqual(viewport.width + TOOLTIP_WIDTH);
    expect(position.left).toBeLessThanOrEqual(viewport.width);
  });

  it("defaults to bottom when nothing fits anywhere", () => {
    const tinyViewport = { width: 100, height: 100 };
    const target = { top: 40, left: 40, width: 20, height: 20 };

    const position = computeTooltipPosition(target, tinyViewport, "top");

    expect(position.placement).toBe("bottom");
  });
});
