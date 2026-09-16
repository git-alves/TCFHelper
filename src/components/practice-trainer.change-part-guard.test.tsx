// @vitest-environment happy-dom
//
// Regression test for the silent draft-loss bug: "Change task part" used to
// call returnToSkills() directly, clearing an in-progress typed answer with
// no confirmation. Mounts the real PracticeTrainer (only next/navigation is
// mocked) and drives it through the DOM, the same pattern used by
// writing-workspace.walkthrough.test.tsx.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { getAppCopy } from "@/lib/app-copy";
import { PracticeTrainer, type CuratedPracticeCurriculum } from "@/components/practice-trainer";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copy = getAppCopy("en").practice;

const curriculum: CuratedPracticeCurriculum = {
  skills: [
    {
      id: "skill-1",
      task: "TASK_1",
      level: "B2",
      part_order: 1,
      is_available: true,
      label: "Opening a letter",
      description: "Practice a formal opening.",
      learning_outcome: "Write a formal opening line.",
      estimated_minutes: 5,
    },
  ],
  exercises: [
    {
      id: "ex-1",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "transform",
      prompt: "Rewrite this informally-toned sentence formally.",
      instructions: "Rewrite the sentence.",
      correct_answer: "Madame, Monsieur, je vous écris au sujet de...",
      accepted_answers: [],
      explanation: "Uses a formal register.",
      target_language_feature: "formal register",
      difficulty: 1,
      sequence_order: 1,
      tags: [],
    },
  ],
};

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

function clickButtonWithText(text: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!button) throw new Error(`button with text "${text}" not found`);
  act(() => {
    button.click();
  });
}

function typeAnswer(text: string) {
  const textarea = container.querySelector("textarea");
  if (!textarea) throw new Error("answer textarea not found");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function startExercise() {
  act(() => {
    root.render(
      <AppLocaleProvider initialLocale="en">
        <PracticeTrainer curriculum={curriculum} />
      </AppLocaleProvider>,
    );
  });

  clickButtonWithText(copy.tasks.TASK_1.title);
  clickButtonWithText("B2");

  // Open the part picker (ThemedSelect) and choose the only option.
  const trigger = container.querySelector('button[aria-haspopup="listbox"]');
  if (!trigger) throw new Error("part picker trigger not found");
  act(() => {
    (trigger as HTMLButtonElement).click();
  });
  clickButtonWithText("Opening a letter");

  clickButtonWithText(copy.startFresh);
}

describe("PracticeTrainer: change-part draft guard", () => {
  it("confirms before discarding a typed draft, and preserves it on cancel", async () => {
    await startExercise();

    typeAnswer("Madame, Monsieur, je vous écris");
    expect(container.querySelector("textarea")?.value).toBe("Madame, Monsieur, je vous écris");

    clickButtonWithText(copy.changePart);

    // Confirmation dialog appears instead of navigating away immediately.
    expect(container.textContent).toContain(copy.changePartConfirmTitle);
    // The exercise view -- and the typed draft -- are still there underneath.
    expect(container.querySelector("textarea")?.value).toBe("Madame, Monsieur, je vous écris");

    clickButtonWithText(copy.changePartConfirmKeep);

    expect(container.textContent).not.toContain(copy.changePartConfirmTitle);
    expect(container.querySelector("textarea")?.value).toBe("Madame, Monsieur, je vous écris");
  });

  it("discards the draft and returns to selection once the learner confirms", async () => {
    await startExercise();

    typeAnswer("Draft to be discarded");
    clickButtonWithText(copy.changePart);
    clickButtonWithText(copy.changePartConfirmDiscard);

    expect(container.textContent).not.toContain(copy.changePartConfirmTitle);
    // Back on the setup screen: the exercise textarea is gone, task choice
    // is visible again.
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).toContain(copy.chooseTask);
  });

  it("navigates immediately, with no confirmation, when there is no draft", async () => {
    await startExercise();

    clickButtonWithText(copy.changePart);

    expect(container.textContent).not.toContain(copy.changePartConfirmTitle);
    expect(container.querySelector("textarea")).toBeNull();
  });
});
