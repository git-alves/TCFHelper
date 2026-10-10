// @vitest-environment happy-dom
//
// Client half of the formatting-only-edit regression (the server half lives
// in src/app/api/essays/correct/formatting-reuse.test.ts). After a draft is
// corrected, a spacing-only edit must keep the Correct button disabled and
// say why -- and "View correction" must still show the text that was actually
// graded, with the model's error highlight on the right slice, never the
// edited draft whose later offsets have shifted.
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

const ERROR_WORD = "mot50";
const words = Array.from({ length: 62 }, (_, index) => `mot${index + 1}`);
const submitted = `${words.slice(0, 9).join(" ")}  ${words.slice(9).join(" ")}`;
const retyped = submitted.replace("  ", " ");
const errorStart = submitted.indexOf(ERROR_WORD);

const feedback = {
  correctedText: submitted,
  modelVersion: "Un modèle.",
  scores: {
    content: { score: 60, feedback: "ok" },
    linguistics: { score: 60, feedback: "ok" },
    vocabulary: { score: 60, feedback: "ok" },
  },
  cefr: {
    estimatedLevel: "B1",
    conservativeLevel: "B1",
    confidence: "Medium",
    rationale: "r",
    evidence: "e",
    blocker: "b",
  },
  meetsWordCount: true,
  wordCountNote: "ok",
  errors: [
    {
      originalText: ERROR_WORD,
      originalStart: errorStart,
      correctedText: `${ERROR_WORD}!`,
      correctionStart: null,
      explanation: "x",
      errorType: "grammar",
    },
  ],
  suggestions: ["s"],
  summary: "ok",
};

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
        return { ok: true, json: async () => ({ essayId: "essay_1", feedback }) } as Response;
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
    // React tracks the value itself, so go through the native setter.
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(editor, value);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function buttonWithText(text: string) {
  return [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
}

describe("WritingWorkspace: formatting-only edit after a correction", () => {
  it("keeps the correction, explains the reuse, and shows the graded text with its highlight intact", async () => {
    const copy = getAppCopy("en");
    await reachReadyState();

    typeIntoEditor(submitted);
    await act(async () => {
      buttonWithText(copy.workspace.editor.correct)!.click();
    });
    expect(correctCalls).toBe(1);

    // The learner tidies the doubled space. No new grading is offered...
    typeIntoEditor(retyped);
    expect(buttonWithText(copy.workspace.editor.correct)!.disabled).toBe(true);
    expect(container.textContent).toContain(copy.workspace.editor.alreadyCorrectedFormattingNote);

    // ...and the result that opens is for the text exactly as it was graded.
    act(() => {
      buttonWithText(copy.workspace.correctionModal.viewCorrection)!.click();
    });
    const highlights = [...document.querySelectorAll("mark")].map((mark) => mark.textContent);
    expect(highlights).toContain(ERROR_WORD);
    expect(document.body.textContent).toContain("mot9  mot10");
    expect(correctCalls).toBe(1);
  });

  it("offers a new correction when a word actually changes", async () => {
    const copy = getAppCopy("en");
    await reachReadyState();

    typeIntoEditor(submitted);
    await act(async () => {
      buttonWithText(copy.workspace.editor.correct)!.click();
    });

    typeIntoEditor(retyped.replace("mot3 mot4", "mot3mot4"));

    expect(buttonWithText(copy.workspace.editor.correct)!.disabled).toBe(false);
    expect(container.textContent).not.toContain(copy.workspace.editor.alreadyCorrectedFormattingNote);
  });
});
