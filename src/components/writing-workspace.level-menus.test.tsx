// @vitest-environment happy-dom
//
// Regression tests for folding the target-level picker into the "Generate
// sample text" and "Guided writing" buttons as independent dropdowns,
// replacing the single shared "Target level" selector that used to sit
// visually next to Guided Writing while secretly also controlling the
// unrelated Generate button further down the page. Mounts the real
// WritingWorkspace via happy-dom + act, reusing the same
// WalkthroughWorkspaceScriptProvider driver as
// writing-workspace.walkthrough.test.tsx to reach a ready state (a task and
// a real topic) without reimplementing the full task/topic-picker UI flow.
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let fetchCalls: { url: string; body: unknown }[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body as string) : null });
      return { ok: false, json: async () => ({}) } as Response;
    }),
  );
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function TourScript({ capture }: { capture: (ctx: ReturnType<typeof useWalkthroughWorkspaceScript>) => void }) {
  const ctx = useWalkthroughWorkspaceScript();
  capture(ctx);
  return null;
}

// Reuses the tour's own "guided-writing" step, which sets a task, a real
// (custom) topic, and opens the guide -- exactly the ready state both level
// menus need, without reimplementing the manual task/topic-picker flow.
async function reachReadyState() {
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
  act(() => {
    ctx.applyStep("guided-writing");
  });
  // Let the (mocked, failing) recent-topic-invalidation microtasks settle.
  await act(async () => {
    await Promise.resolve();
  });
}

function clickButtonWithText(text: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(text));
  if (!button) throw new Error(`button with text "${text}" not found`);
  act(() => {
    button.click();
  });
}

function clickMenuItem(level: "B2" | "C1" | "C2") {
  const item = [...container.querySelectorAll('[role="menuitem"]')].find((el) => el.textContent === level);
  if (!item) throw new Error(`menu item "${level}" not found`);
  act(() => {
    (item as HTMLButtonElement).click();
  });
}

describe("WritingWorkspace: independent level menus", () => {
  it("Generate sample text: opens a level menu and requests generation at the picked level", async () => {
    await reachReadyState();

    clickButtonWithText("Generate example");
    clickMenuItem("C1");

    await act(async () => {
      await Promise.resolve();
    });

    const exampleCalls = fetchCalls.filter((call) => call.url === "/api/essays/example");
    expect(exampleCalls).toHaveLength(1);
    expect(exampleCalls[0].body).toMatchObject({ level: "C1" });
  });

  it("Guided writing's level is independent from the example generator's", async () => {
    await reachReadyState();

    // Guided writing opened at the default level (B2).
    expect(container.textContent).toContain("Guide for B2");

    // Pick C1 for the example generator via its own menu.
    clickButtonWithText("Generate example");
    clickMenuItem("C1");
    await act(async () => {
      await Promise.resolve();
    });

    // The guide is still showing B2 -- picking a level on one button must
    // not silently change the other.
    expect(container.textContent).toContain("Guide for B2");
    expect(container.textContent).not.toContain("Guide for C1");

    // Now change only the guide's level, via its own caret.
    const guidedWritingToggle = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "Writing guide" || candidate.textContent === "Hide writing guide",
    );
    if (!guidedWritingToggle) throw new Error("guided writing toggle not found");
    const caret = guidedWritingToggle.nextElementSibling;
    if (!(caret instanceof HTMLButtonElement)) throw new Error("guided writing level caret not found");
    act(() => {
      caret.click();
    });
    clickMenuItem("C2");

    expect(container.textContent).toContain("Guide for C2");
    expect(container.textContent).not.toContain("Guide for B2");

    // The last example-generation request is still the one made at C1,
    // confirming the guide's level change didn't retroactively affect it.
    const exampleCalls = fetchCalls.filter((call) => call.url === "/api/essays/example");
    expect(exampleCalls).toHaveLength(1);
    expect(exampleCalls[0].body).toMatchObject({ level: "C1" });
  });

  it("opens the level menu upward when the trigger is near the bottom of the viewport", async () => {
    await reachReadyState();

    const originalInnerHeight = window.innerHeight;
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    // Every element reports the same near-the-bottom rect -- only the
    // trigger's own rect is read by resolveMenuPlacement's caller, so this
    // is a simpler stand-in than tracking which element is being measured.
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { top: 580, bottom: 595, left: 0, right: 100, width: 100, height: 15, x: 0, y: 580, toJSON() {} } as DOMRect;
    };

    try {
      clickButtonWithText("Generate example");
      const menu = container.querySelector('[role="menu"]');
      if (!menu) throw new Error("level menu not found");
      expect(menu.className).toContain("bottom-full");
      expect(menu.className).not.toContain("top-full");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
    }
  });
});
