import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { APP_COPY } from "@/lib/app-copy";
import { WalkthroughOverlay, type WalkthroughStepContent } from "./walkthrough-overlay";

const steps: WalkthroughStepContent[] = [
  { id: "task-picker", title: "Choose a task", body: "Start by picking Task 1, 2, or 3." },
  { id: "correct-button", title: "Get feedback", body: "Click Correct once you're happy with your draft." },
];

function render(open: boolean, stepIndex = 0) {
  return renderToStaticMarkup(
    createElement(WalkthroughOverlay, {
      open,
      steps,
      stepIndex,
      copy: APP_COPY.en.walkthrough,
      onNext: () => {},
      onBack: () => {},
      onSkip: () => {},
      onFinish: () => {},
    }),
  );
}

describe("WalkthroughOverlay", () => {
  it("renders nothing when closed", () => {
    expect(render(false)).toBe("");
  });

  it("renders nothing before the target element has been measured client-side", () => {
    // The target-rect hook only measures via a client effect, which never
    // runs during a static/server render -- so even an "open" tour renders
    // nothing here, on purpose, rather than a wrongly-positioned tooltip.
    expect(render(true)).toBe("");
    expect(render(true, steps.length - 1)).toBe("");
  });
});
