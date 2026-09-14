// @vitest-environment happy-dom
//
// The only piece of TasksWalkthroughRunner/WritingWorkspace's coordination
// that has no Next.js dependency (no useRouter/useSearchParams/useAppCopy)
// is this context itself -- so it's the one part of the pair that can be
// mounted and driven interactively instead of only type-checked. It can't
// exercise the real /api/topics/recent fetch (that lives in WritingWorkspace,
// which does need that Next.js context), but it locks in the contract that
// fetch depends on: a step can be marked blocked, TasksWalkthroughRunner's
// Next lock (mirrored here as a disabled button) reflects that on the very
// next render, and every place WritingWorkspace clears it -- fetch success,
// fetch failure, and an explicit cancel -- runs through the same
// setBlockedStep(null) call, so there is exactly one release path to keep
// in sync with the fetch's own finally block.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useWalkthroughWorkspaceScript,
  WalkthroughWorkspaceScriptProvider,
  type WalkthroughScriptHandlers,
} from "./walkthrough-workspace-script";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function nextButton(): HTMLButtonElement {
  const button = container.querySelector("button");
  if (!button) throw new Error("next button not found");
  return button;
}

function Consumer({ capture }: { capture: (ctx: ReturnType<typeof useWalkthroughWorkspaceScript>) => void }) {
  const ctx = useWalkthroughWorkspaceScript();
  capture(ctx);
  return (
    <button type="button" disabled={ctx.blockedStepId === "topic-picker"}>
      Next
    </button>
  );
}

describe("WalkthroughWorkspaceScriptProvider", () => {
  it("holds Next disabled while the active step is blocked, and releases it once cleared", () => {
    let ctx!: ReturnType<typeof useWalkthroughWorkspaceScript>;
    act(() => {
      root.render(
        <WalkthroughWorkspaceScriptProvider>
          <Consumer capture={(value) => (ctx = value)} />
        </WalkthroughWorkspaceScriptProvider>,
      );
    });

    expect(nextButton().disabled).toBe(false);

    // Mirrors fetchRecentTopic's synchronous setBlockedStep("topic-picker")
    // call at the moment the fetch begins.
    act(() => {
      ctx.setBlockedStep("topic-picker");
    });
    expect(nextButton().disabled).toBe(true);

    // Mirrors fetchRecentTopic's finally block -- the same call runs
    // whether the request that just settled succeeded or failed.
    act(() => {
      ctx.setBlockedStep(null);
    });
    expect(nextButton().disabled).toBe(false);
  });

  it("only disables Next for the step it was actually blocked for", () => {
    let ctx!: ReturnType<typeof useWalkthroughWorkspaceScript>;
    act(() => {
      root.render(
        <WalkthroughWorkspaceScriptProvider>
          <Consumer capture={(value) => (ctx = value)} />
        </WalkthroughWorkspaceScriptProvider>,
      );
    });

    act(() => {
      ctx.setBlockedStep("guided-writing");
    });
    // The rendered button only mirrors the "topic-picker" block (as
    // TasksWalkthroughRunner's real nextDisabled check does), so a block
    // registered for a different step id must not disable it.
    expect(nextButton().disabled).toBe(false);
    expect(ctx.blockedStepId).toBe("guided-writing");
  });

  it("clears an outstanding block when the tour resets, alongside forwarding resetDemo", () => {
    let ctx!: ReturnType<typeof useWalkthroughWorkspaceScript>;
    act(() => {
      root.render(
        <WalkthroughWorkspaceScriptProvider>
          <Consumer capture={(value) => (ctx = value)} />
        </WalkthroughWorkspaceScriptProvider>,
      );
    });

    const handlers: WalkthroughScriptHandlers = {
      applyStep: vi.fn(() => false),
      resetDemo: vi.fn(),
    };
    act(() => {
      ctx.register(handlers);
      ctx.setBlockedStep("topic-picker");
    });
    expect(nextButton().disabled).toBe(true);

    act(() => {
      ctx.resetDemo();
    });
    expect(nextButton().disabled).toBe(false);
    expect(handlers.resetDemo).toHaveBeenCalledTimes(1);
  });

  it("buffers an applyStep call made before a handler registers, and replays it once one does", () => {
    let ctx!: ReturnType<typeof useWalkthroughWorkspaceScript>;
    act(() => {
      root.render(
        <WalkthroughWorkspaceScriptProvider>
          <Consumer capture={(value) => (ctx = value)} />
        </WalkthroughWorkspaceScriptProvider>,
      );
    });

    // No handler registered yet -- matches the very first commit of the
    // /tasks page, where TasksWalkthroughRunner's auto-start effect can call
    // applyStep("task-picker") before WritingWorkspace's own registration
    // effect has run.
    act(() => {
      expect(ctx.applyStep("task-picker")).toBe(false);
    });

    const applyStep = vi.fn(() => false);
    act(() => {
      ctx.register({ applyStep, resetDemo: vi.fn() });
    });

    expect(applyStep).toHaveBeenCalledExactlyOnceWith("task-picker");
  });
});
