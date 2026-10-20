// @vitest-environment happy-dom
//
// The generated example is its own card below the toolbar (never written into
// the draft), and the translation opens as a split column beside the editor.
// The two are independent UI states.
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
let exampleTexts: string[];
let writeText: ReturnType<typeof vi.fn>;
let ctx: ReturnType<typeof useWalkthroughWorkspaceScript>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchCalls = [];
  exampleTexts = ["Bonjour, voici un exemple."];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body as string) : null });
      if (url === "/api/essays/example") {
        const text = exampleTexts.length > 1 ? exampleTexts.shift() : exampleTexts[0];
        return { ok: true, json: async () => ({ text }) } as Response;
      }
      if (url === "/api/translate") {
        return { ok: true, json: async () => ({ translation: "Translated draft", provider: "deepl" }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }),
  );
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
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
  act(() => {
    ctx.applyStep("editor");
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

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

function textarea() {
  return container.querySelector("#essay-content") as HTMLTextAreaElement;
}

function buttonByLabel(label: string) {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`button "${label}" not found`);
  return button as HTMLButtonElement;
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.click();
  });
}

async function generate(level: "B2" | "C1" | "C2") {
  clickButtonWithText("Generate example");
  clickMenuItem(level);
  await flush();
}

function layoutRoot() {
  return textarea().closest("[data-layout]") as HTMLElement;
}

describe("WritingWorkspace: example card and translation split", () => {
  it("shows a generated example below the editor without touching the draft", async () => {
    await reachReadyState();
    const draft = textarea().value;
    expect(draft).not.toBe("");

    await generate("C1");

    // No overwrite confirmation, draft untouched and still editable.
    expect(container.textContent).not.toContain("Replace draft");
    expect(textarea().value).toBe(draft);
    expect(textarea().disabled).toBe(false);
    expect(container.textContent).toContain("Bonjour, voici un exemple.");
    expect(container.textContent).toContain("Example response (C1)");
  });

  it("copies the example, and deleting it closes the card", async () => {
    await reachReadyState();
    await generate("B2");

    click(buttonByLabel("Copy example"));
    await flush();
    expect(writeText).toHaveBeenCalledWith("Bonjour, voici un exemple.");

    click(buttonByLabel("Close example"));
    expect(container.textContent).not.toContain("Bonjour, voici un exemple.");
    expect(container.querySelector('button[aria-label="Close example"]')).toBeNull();
  });

  it("replaces the previous example when generating again", async () => {
    exampleTexts = ["Premier exemple.", "Second exemple."];
    await reachReadyState();
    await generate("B2");
    expect(container.textContent).toContain("Premier exemple.");

    await generate("C2");
    expect(container.textContent).toContain("Second exemple.");
    expect(container.textContent).not.toContain("Premier exemple.");
    expect(container.textContent).toContain("Example response (C2)");
  });

  it("splits the editor when translating and restores it when hidden", async () => {
    await reachReadyState();
    expect(layoutRoot().dataset.layout).toBe("single");

    clickButtonWithText("Show translation");
    await flush();
    expect(layoutRoot().dataset.layout).toBe("split");
    expect(layoutRoot().textContent).toContain("Translated draft");

    clickButtonWithText("Hide translation");
    expect(layoutRoot().dataset.layout).toBe("single");
    expect(container.textContent).not.toContain("Translated draft");
  });

  it("keeps the example and the translation independent of each other", async () => {
    await reachReadyState();
    clickButtonWithText("Show translation");
    await flush();
    await generate("C1");

    // The example card is outside the split, and never holds a translation.
    expect(layoutRoot().textContent).not.toContain("Bonjour, voici un exemple.");
    expect(container.textContent).toContain("Bonjour, voici un exemple.");
    expect(fetchCalls.filter((call) => call.url === "/api/translate")).toHaveLength(1);

    clickButtonWithText("Hide translation");
    expect(container.textContent).toContain("Bonjour, voici un exemple.");

    clickButtonWithText("Show translation");
    await flush();
    click(buttonByLabel("Close example"));
    expect(container.textContent).toContain("Translated draft");
  });

  it("keeps the example when the draft is cleared or edited", async () => {
    await reachReadyState();
    await generate("B2");

    clickButtonWithText("Clear text");
    clickButtonWithText("Clear");
    await flush();
    expect(container.textContent).toContain("Bonjour, voici un exemple.");
  });
});
