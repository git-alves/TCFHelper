// @vitest-environment happy-dom
//
// Regression tests for three Develop/Produce UX fixes:
// 1. A live word/sentence counter, since the length target ("80 à 100 mots")
//    lives only as prose in the instructions with no other feedback signal.
// 2. Self-review no longer permanently locks the exercise: the learner can
//    keep editing and re-run self-review instead of a one-shot final verdict.
// 3. An explicit note that the exercise content is French exam material, so
//    a Portuguese/English/Spanish interface doesn't read as an incomplete
//    translation.
// Mounts the real PracticeTrainer via happy-dom + act, same pattern as
// practice-trainer.change-part-guard.test.tsx.
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
      id: "ex-produce",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "produce",
      prompt: "Vous écrivez à votre université.",
      instructions: "Rédigez les deux premières phrases du message.",
      accepted_answers: [],
      explanation: "Le but doit être clair dès la première phrase.",
      target_language_feature: "but autonome et contextualisé",
      difficulty: 6,
      sequence_order: 6,
      tags: [],
      self_check: ["Le but du message est clair dès la première phrase."],
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

function textarea(): HTMLTextAreaElement {
  const el = container.querySelector("textarea");
  if (!el) throw new Error("textarea not found");
  return el;
}

function typeAnswer(text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(textarea(), text);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function startProduceExercise() {
  act(() => {
    root.render(
      <AppLocaleProvider initialLocale="en">
        <PracticeTrainer curriculum={curriculum} />
      </AppLocaleProvider>,
    );
  });

  clickButtonWithText(copy.tasks.TASK_1.title);
  clickButtonWithText("B2");

  const trigger = container.querySelector('button[aria-haspopup="listbox"]');
  if (!trigger) throw new Error("part picker trigger not found");
  act(() => {
    (trigger as HTMLButtonElement).click();
  });
  clickButtonWithText("Opening a letter");

  clickButtonWithText(copy.startFresh);
}

describe("PracticeTrainer: Develop/Produce UX", () => {
  it("shows the exam-task language note above the French prompt", () => {
    startProduceExercise();

    expect(container.textContent).toContain(copy.examTaskLanguageNote);
  });

  it("shows a live word/sentence counter that updates as the learner types", () => {
    startProduceExercise();

    expect(container.textContent).toContain(copy.lengthCounter({ words: 0, sentences: 0 }));

    typeAnswer("Bonjour. Comment allez-vous");

    expect(container.textContent).toContain(copy.lengthCounter({ words: 3, sentences: 2 }));
  });

  it("keeps the response editable after self-review and lets the learner revise before finishing", () => {
    startProduceExercise();

    typeAnswer("Madame, Monsieur, je vous écris.");
    clickButtonWithText(copy.selfReview);

    // Checklist and the finish action both appear -- not locked into a
    // one-shot verdict.
    expect(textarea().disabled).toBe(false);
    expect(container.textContent).toContain("Le but du message est clair");
    expect(container.textContent).toContain(copy.finishSequence);

    // Editing invalidates the previous self-assessment: checklist and the
    // finish action drop away until self-review runs again.
    typeAnswer("Madame, Monsieur, je vous écris car je souhaite reporter mon inscription.");
    expect(container.textContent).not.toContain("Le but du message est clair");
    expect(container.textContent).not.toContain(copy.finishSequence);

    clickButtonWithText(copy.selfReview);
    expect(container.textContent).toContain("Le but du message est clair");
    expect(container.textContent).toContain(copy.finishSequence);
  });
});
