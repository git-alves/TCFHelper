// @vitest-environment happy-dom
//
// A draft that is not French must never be sent for correction: the learner
// is told why inline, no request is made, and editing the draft clears the
// message. If the local check passes but the server still answers
// NOT_FRENCH_TEXT, the same inline message appears instead of the generic
// failure dialog.
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

const ENGLISH_DRAFT = Array.from(
  { length: 8 },
  () => "I am writing to tell you about my neighbourhood, which is very quiet and has many shops.",
).join(" ");
const FRENCH_DRAFT = Array.from(
  { length: 6 },
  () => "Je vous écris pour vous parler de mon quartier, qui est très agréable et dans lequel il y a beaucoup de commerces.",
).join(" ");

let container: HTMLDivElement;
let root: Root;
let correctCalls: number;
let correctResponse: () => Response;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  correctCalls = 0;
  correctResponse = () => ({ ok: false, json: async () => ({}) }) as Response;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/essays/correct") {
        correctCalls += 1;
        return correctResponse();
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

describe("WritingWorkspace: non-French drafts", () => {
  it("explains the problem and sends nothing when the draft is not French", async () => {
    const copy = getAppCopy("en");
    await reachReadyState();

    typeIntoEditor(ENGLISH_DRAFT);
    await act(async () => {
      buttonWithText(copy.workspace.editor.correct)!.click();
    });

    expect(correctCalls).toBe(0);
    expect(container.textContent).toContain(copy.workspace.editor.notFrenchText);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("clears the message as soon as the learner edits the draft, and corrects French", async () => {
    const copy = getAppCopy("en");
    await reachReadyState();

    typeIntoEditor(ENGLISH_DRAFT);
    await act(async () => {
      buttonWithText(copy.workspace.editor.correct)!.click();
    });
    expect(container.textContent).toContain(copy.workspace.editor.notFrenchText);

    typeIntoEditor(FRENCH_DRAFT);
    expect(container.textContent).not.toContain(copy.workspace.editor.notFrenchText);

    await act(async () => {
      buttonWithText(copy.workspace.editor.correct)!.click();
    });
    expect(correctCalls).toBe(1);
    expect(container.textContent).not.toContain(copy.workspace.editor.notFrenchText);
  });

  it("shows the same inline message when the server refuses the text as not French", async () => {
    const copy = getAppCopy("en");
    correctResponse = () =>
      ({
        ok: false,
        status: 422,
        json: async () => ({ code: "NOT_FRENCH_TEXT", reason: "language" }),
      }) as Response;
    await reachReadyState();

    typeIntoEditor(FRENCH_DRAFT);
    await act(async () => {
      buttonWithText(copy.workspace.editor.correct)!.click();
    });

    expect(correctCalls).toBe(1);
    expect(container.textContent).toContain(copy.workspace.editor.notFrenchText);
    expect(container.textContent).not.toContain(copy.workspace.editor.genericCorrectionError);
  });
});
