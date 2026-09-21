// @vitest-environment happy-dom
//
// Regression test for a real bug found on the Tasks tour at mobile widths:
// a long step body (e.g. the task-picker step's three-sentence description)
// rendered taller than the fixed TOOLTIP_HEIGHT estimate on a narrow/short
// viewport, and since the whole dialog scrolled as one block, the
// Skip/Back/Next row could end up scrolled out of view below the fold --
// reachable only if the learner happened to notice the tiny panel itself
// was scrollable. The fix splits the dialog into a scrollable body and a
// footer that stays outside that scroll area. Mounts the real
// WalkthroughOverlay against a real target element in the DOM (happy-dom
// does layout for getBoundingClientRect, unlike jsdom) so the target-rect
// measurement effect actually runs.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { APP_COPY } from "@/lib/app-copy";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_BODY =
  "TCF written expression has three task types: Tâche 1 (communicate effectively in a short message, for the right reader and in the right register), Tâche 2 (recount an experience for several readers, with commentary suited to its purpose), and Tâche 3 (analyze a topic from different points of view). We'll walk through Tâche 1 as an example.";

const steps: WalkthroughStepContent[] = [
  { id: "test-target", title: "Choose a task", body: LONG_BODY },
  { id: "test-target", title: "Second step", body: "Short body." },
];

let container: HTMLDivElement;
let root: Root;
let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement("div");
  target.setAttribute("data-walkthrough", "test-target");
  // Mimics a target sitting near the top of a short mobile viewport, the
  // condition that starved the tooltip of room below it.
  Object.assign(target.style, { position: "absolute", top: "10px", left: "10px", width: "300px", height: "80px" });
  document.body.appendChild(target);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  target.remove();
});

describe("WalkthroughOverlay on a short viewport with a long step body", () => {
  it("keeps Skip/Back/Next outside the scrollable body region", async () => {
    await act(async () => {
      root.render(
        <WalkthroughOverlay
          open
          steps={steps}
          stepIndex={0}
          copy={APP_COPY.en.walkthrough}
          onNext={() => {}}
          onBack={() => {}}
          onSkip={() => {}}
          onFinish={() => {}}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const nextButton = [...dialog!.querySelectorAll("button")].find((button) => button.textContent === "Next");
    expect(nextButton).toBeTruthy();

    // No stylesheet is loaded in this unit test, so computed overflow styles
    // stay at their initial value regardless of class name -- this walks up
    // for the Tailwind overflow-y-auto class itself instead of the resolved
    // style, which is what actually matters here: the body text and the
    // Skip/Back/Next row must not share this ancestor.
    const bodyText = document.getElementById(dialog!.getAttribute("aria-describedby")!);
    expect(bodyText).toBeTruthy();
    let scrollableAncestor: Element | null = bodyText;
    while (scrollableAncestor && scrollableAncestor !== dialog) {
      if (scrollableAncestor.classList.contains("overflow-y-auto")) break;
      scrollableAncestor = scrollableAncestor.parentElement;
    }
    expect(scrollableAncestor).not.toBeNull();
    expect(scrollableAncestor).not.toBe(dialog);

    // The regression: Next must never be inside that same scrollable region.
    expect(scrollableAncestor!.contains(nextButton!)).toBe(false);
  });
});
