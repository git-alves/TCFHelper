// @vitest-environment happy-dom
//
// "Correct" spends one of the learner's daily corrections, so a click must
// ask first -- but only when a request would really be sent. Draft problems
// that are rejected locally for free (too short, not French) must not add a
// pointless extra step, and Retry after a failure must not ask a second time.
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
import { getAppCopy } from "@/lib/app-copy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copy = getAppCopy("en");
const FRENCH_DRAFT = Array.from(
  { length: 6 },
  () => "Je vous écris pour vous parler de mon quartier, qui est très agréable et dans lequel il y a beaucoup de commerces.",
).join(" ");
const SHORT_FRENCH_DRAFT = "Je vous écris pour vous parler de mon quartier.";

let container: HTMLDivElement;
let root: Root;
let correctCalls: number;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  correctCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/essays/correct") {
        correctCalls += 1;
        // A failing provider: the modal's Retry is the second call.
        return { ok: false, status: 502, json: async () => ({ error: "boom" }) } as Response;
      }
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
  capture(useWalkthroughWorkspaceScript());
  return null;
}

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
  await act(async () => {
    await Promise.resolve();
  });
}

function typeIntoEditor(value: string) {
  const editor = document.getElementById("essay-content") as HTMLTextAreaElement | null;
  if (!editor) throw new Error("essay editor not found");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(editor, value);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function buttonWithText(text: string) {
  return [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
}

async function click(label: string) {
  await act(async () => {
    buttonWithText(label)!.click();
  });
}

describe("WritingWorkspace: confirming a correction", () => {
  it("asks before sending and sends nothing until the learner confirms", async () => {
    await reachReadyState();
    typeIntoEditor(FRENCH_DRAFT);

    await click(copy.workspace.editor.correct);

    expect(correctCalls).toBe(0);
    expect(container.textContent).toContain(copy.workspace.dialog.correctTitle);
    expect(container.textContent).toContain(copy.workspace.dialog.correctDescription);

    await click(copy.workspace.dialog.correctConfirm);
    expect(correctCalls).toBe(1);
  });

  it("sends nothing and keeps the draft when the learner cancels", async () => {
    await reachReadyState();
    typeIntoEditor(FRENCH_DRAFT);

    await click(copy.workspace.editor.correct);
    await click(copy.workspace.dialog.cancel);

    expect(correctCalls).toBe(0);
    expect(container.textContent).not.toContain(copy.workspace.dialog.correctTitle);
    expect((document.getElementById("essay-content") as HTMLTextAreaElement).value).toBe(FRENCH_DRAFT);
  });

  it("does not ask for a draft that is rejected locally for free", async () => {
    await reachReadyState();
    typeIntoEditor(SHORT_FRENCH_DRAFT);

    await click(copy.workspace.editor.correct);

    expect(container.textContent).not.toContain(copy.workspace.dialog.correctTitle);
    expect(correctCalls).toBe(0);
  });

  it("does not ask a second time when retrying after a failed correction", async () => {
    await reachReadyState();
    typeIntoEditor(FRENCH_DRAFT);
    await click(copy.workspace.editor.correct);
    await click(copy.workspace.dialog.correctConfirm);
    expect(correctCalls).toBe(1);

    await click(copy.workspace.correctionModal.tryAgain);

    expect(correctCalls).toBe(2);
    expect(container.textContent).not.toContain(copy.workspace.dialog.correctTitle);
  });
});
