import { describe, expect, it } from "vitest";
import { selectMenuPlacement } from "./themed-select";

describe("selectMenuPlacement", () => {
  it("opens below when the scrollable boundary has room for the menu", () => {
    expect(
      selectMenuPlacement({
        triggerTop: 180,
        triggerBottom: 220,
        boundaryTop: 80,
        boundaryBottom: 520,
        menuHeight: 160,
      }),
    ).toBe("below");
  });

  it("flips above rather than clipping a menu below the visible modal area", () => {
    expect(
      selectMenuPlacement({
        triggerTop: 390,
        triggerBottom: 430,
        boundaryTop: 80,
        boundaryBottom: 452,
        menuHeight: 160,
      }),
    ).toBe("above");
  });

  it("keeps the conventional downward direction when neither side fully fits and below has more room", () => {
    expect(
      selectMenuPlacement({
        triggerTop: 120,
        triggerBottom: 160,
        boundaryTop: 80,
        boundaryBottom: 250,
        menuHeight: 160,
      }),
    ).toBe("below");
  });
});
