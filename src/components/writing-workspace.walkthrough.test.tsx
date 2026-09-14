// @vitest-environment happy-dom
//
// Regression test for the contextual (short) tour's topic-picker failure
// path: task-picker -> topic-picker -> editor -> correct-button never
// passes through guided-writing, so unlike the full tour it can't rely on
// that step's own scripted topic to paper over a failed /api/topics/recent
// call. Renders the real WritingWorkspace (mocking only next/navigation,
// which none of this behavior depends on) driven through
// WalkthroughWorkspaceScriptProvider the same way TasksWalkthroughRunner
// drives it, so this exercises the actual disabled-button DOM, not a stand-in.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { DashboardNavGuardProvider } from "@/components/dashboard-nav-guard";
import {
  useWalkthroughWorkspaceScript,
  WalkthroughWorkspaceScriptProvider,
} from "@/components/walkthrough-workspace-script";
import { WritingWorkspace } from "@/components/writing-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// Not using @testing-library/react (not a dependency here), so this repo's
// usual auto-setup for React's act() doesn't run -- set the flag it would
// have set, or the async act() block below warns on every run.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false, json: async () => ({}) }) as Response),
  );
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function correctButton(): HTMLButtonElement {
  const button = container.querySelector('[data-walkthrough="correct-button"]');
  if (!(button instanceof HTMLButtonElement)) throw new Error("correct-button not found");
  return button;
}

// Mirrors what TasksWalkthroughRunner does: announce each contextual-tour
// step as it becomes active.
function TourScript({ capture }: { capture: (ctx: ReturnType<typeof useWalkthroughWorkspaceScript>) => void }) {
  const ctx = useWalkthroughWorkspaceScript();
  capture(ctx);
  return null;
}

describe("contextual tour: failed topic-picker fetch", () => {
  it("still leaves correct-button usable, instead of stuck disabled", async () => {
    let ctx!: ReturnType<typeof useWalkthroughWorkspaceScript>;
    act(() => {
      root.render(
        <AppLocaleProvider initialLocale="en">
          <DashboardNavGuardProvider>
            <WalkthroughWorkspaceScriptProvider>
              <TourScript capture={(value) => (ctx = value)} />
              <WritingWorkspace />
            </WalkthroughWorkspaceScriptProvider>
          </DashboardNavGuardProvider>
        </AppLocaleProvider>,
      );
    });

    act(() => {
      ctx.applyStep("task-picker");
    });

    // Kicks off the (mocked, failing) /api/topics/recent request and
    // synchronously blocks Next in the same commit -- see fetchRecentTopic.
    act(() => {
      ctx.applyStep("topic-picker");
    });
    expect(ctx.blockedStepId).toBe("topic-picker");
    expect(correctButton().disabled).toBe(true);

    // Let the mocked fetch's rejection settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ctx.blockedStepId).toBeNull();
    // The short tour never runs guided-writing, so this only holds because
    // fetchRecentTopic's failure branch scripts its own fallback topic
    // directly (applyWalkthroughTopicFallback) instead of leaving
    // activeTopicPrompt empty.
    expect(correctButton().disabled).toBe(false);
  });
});
