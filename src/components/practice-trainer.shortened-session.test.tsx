// @vitest-environment happy-dom
//
// Regression tests for the shortened practice session: only the session
// stages are served (even though the bank authors six), a single difficulty
// rating is asked once the session ends, and a saved session from the old
// six-exercise sequence is discarded while a valid shortened one resumes.
// Mounts the real PracticeTrainer via happy-dom + act, same pattern as
// practice-trainer.develop-produce-ux.test.tsx.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { getAppCopy } from "@/lib/app-copy";
import { PracticeTrainer, type CuratedPracticeCurriculum } from "@/components/practice-trainer";
import {
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  type StoredPracticeSession,
} from "@/lib/practice-session-storage";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copy = getAppCopy("en").practice;

type Exercise = CuratedPracticeCurriculum["exercises"][number];

const base = { task: "TASK_1", level: "B2", skill: "skill-1", sub_skill: "openings", difficulty: 1, tags: [] } as const;

const RIGHT_OPTION = "Bonjour Madame, je vous écris au sujet de mon dossier.";
const exercises: readonly Exercise[] = [
  {
    ...base,
    id: "ex-recognize",
    exercise_type: "recognize",
    prompt: "recognize-prompt",
    instructions: "i",
    options: [RIGHT_OPTION, "Salut !"],
    correct_answer: RIGHT_OPTION,
    explanation: "e",
    target_language_feature: "f",
    sequence_order: 1,
  },
  {
    ...base,
    id: "ex-complete",
    exercise_type: "complete",
    prompt: "complete-prompt",
    instructions: "i",
    correct_answer: "x",
    explanation: "e",
    target_language_feature: "f",
    sequence_order: 2,
  },
  {
    ...base,
    id: "ex-transform",
    exercise_type: "transform",
    prompt: "transform-prompt",
    instructions: "i",
    correct_answer: "x",
    explanation: "e",
    target_language_feature: "f",
    sequence_order: 3,
  },
  {
    ...base,
    id: "ex-organize",
    exercise_type: "organize",
    prompt: "organize-prompt",
    instructions: "i",
    options: ["A.", "B."],
    correct_answer: ["A.", "B."],
    explanation: "e",
    target_language_feature: "f",
    sequence_order: 4,
  },
  {
    ...base,
    id: "ex-develop",
    exercise_type: "develop",
    prompt: "develop-prompt",
    instructions: "i",
    explanation: "e",
    target_language_feature: "f",
    sequence_order: 5,
    self_check: ["Develop check."],
  },
  {
    ...base,
    id: "ex-produce",
    exercise_type: "produce",
    prompt: "produce-prompt",
    instructions: "i",
    explanation: "e",
    target_language_feature: "f",
    sequence_order: 6,
    self_check: ["Produce check."],
  },
];

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
      estimated_minutes: 10,
    },
  ],
  exercises,
};

const savedSession = (exerciseIds: string[], currentExerciseIndex: number): StoredPracticeSession => ({
  version: 1,
  task: "TASK_1",
  level: "B2",
  skillId: "skill-1",
  exerciseIds,
  currentExerciseIndex,
  answer: "",
  ordering: [],
  checkState: null,
  completionMethods: [],
});

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
  window.localStorage.clear();
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
  if (!textarea) throw new Error("textarea not found");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function mount() {
  act(() => {
    root.render(
      <AppLocaleProvider initialLocale="en">
        <PracticeTrainer curriculum={curriculum} />
      </AppLocaleProvider>,
    );
  });
  // Flush the saved-session loader's setTimeout(0).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function selectPartAndPreview() {
  clickButtonWithText(copy.tasks.TASK_1.title);
  clickButtonWithText("B2");
  const trigger = container.querySelector('button[aria-haspopup="listbox"]');
  if (!trigger) throw new Error("part picker trigger not found");
  act(() => {
    (trigger as HTMLButtonElement).click();
  });
  clickButtonWithText("Opening a letter");
}

describe("PracticeTrainer: shortened session", () => {
  it("previews and runs only the session stages, then asks for one difficulty rating at the end", async () => {
    await mount();
    selectPartAndPreview();

    const preview = container.querySelector('[data-walkthrough="practice-stages-preview"]');
    expect(preview?.querySelectorAll("li")).toHaveLength(3);
    expect(preview?.textContent).toContain(copy.stages.recognize);
    expect(preview?.textContent).toContain(copy.stages.develop);
    expect(preview?.textContent).toContain(copy.stages.produce);
    expect(preview?.textContent).not.toContain(copy.stages.complete);
    expect(preview?.textContent).not.toContain(copy.stages.transform);
    expect(preview?.textContent).not.toContain(copy.stages.organize);

    clickButtonWithText(copy.startFresh);

    // Recognize
    expect(container.textContent).toContain("recognize-prompt");
    expect(container.textContent).toContain(copy.progress({ step: 1, total: 3 }));
    clickButtonWithText(RIGHT_OPTION);
    clickButtonWithText(copy.verify);
    expect(container.textContent).not.toContain(copy.difficultyPrompt);
    clickButtonWithText(copy.nextExercise);

    // Develop (Complete/Transform/Organize are skipped)
    expect(container.textContent).toContain("develop-prompt");
    expect(container.textContent).toContain(copy.progress({ step: 2, total: 3 }));
    typeAnswer("Madame, Monsieur, je vous écris.");
    clickButtonWithText(copy.selfReview);
    expect(container.textContent).not.toContain(copy.difficultyPrompt);
    clickButtonWithText(copy.nextExercise);

    // Produce
    expect(container.textContent).toContain("produce-prompt");
    expect(container.textContent).toContain(copy.progress({ step: 3, total: 3 }));
    typeAnswer("Je vous contacte au sujet de mon inscription.");
    clickButtonWithText(copy.selfReview);
    expect(container.textContent).not.toContain(copy.difficultyPrompt);
    clickButtonWithText(copy.finishSequence);

    // End of session: exactly one rating prompt, recorded once chosen.
    expect(container.textContent).toContain(copy.completedEyebrow);
    expect(container.querySelectorAll("fieldset")).toHaveLength(1);
    expect(container.textContent).toContain(copy.difficultyPrompt);
    expect(container.textContent).not.toContain(copy.difficultyRecorded);

    clickButtonWithText(copy.difficultyAppropriate);
    expect(container.textContent).toContain(copy.difficultyRecorded);
    const pressed = [...container.querySelectorAll('button[aria-pressed="true"]')];
    expect(pressed.map((button) => button.textContent)).toEqual([copy.difficultyAppropriate]);
  });

  it("starts the next replay without carrying over the previous session's rating", async () => {
    await mount();
    selectPartAndPreview();
    clickButtonWithText(copy.startFresh);
    clickButtonWithText(RIGHT_OPTION);
    clickButtonWithText(copy.verify);
    clickButtonWithText(copy.nextExercise);
    typeAnswer("a");
    clickButtonWithText(copy.selfReview);
    clickButtonWithText(copy.nextExercise);
    typeAnswer("b");
    clickButtonWithText(copy.selfReview);
    clickButtonWithText(copy.finishSequence);
    clickButtonWithText(copy.difficultyTooHard);

    clickButtonWithText(copy.replayWithVariants);
    clickButtonWithText(RIGHT_OPTION);
    clickButtonWithText(copy.verify);
    clickButtonWithText(copy.nextExercise);
    typeAnswer("a");
    clickButtonWithText(copy.selfReview);
    clickButtonWithText(copy.nextExercise);
    typeAnswer("b");
    clickButtonWithText(copy.selfReview);
    clickButtonWithText(copy.finishSequence);

    expect(container.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(0);
    expect(container.textContent).not.toContain(copy.difficultyRecorded);
  });
});

describe("PracticeTrainer: saved session migration", () => {
  it("discards a saved session from the old six-exercise sequence instead of offering to resume it", async () => {
    window.localStorage.setItem(
      ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...savedSession(
          ["ex-recognize", "ex-complete", "ex-transform", "ex-organize", "ex-develop", "ex-produce"],
          4,
        ),
        difficultyRatings: [["ex-recognize", "appropriate"]],
      }),
    );

    await mount();

    expect(container.textContent).not.toContain(copy.resumeSession);
    expect(window.localStorage.getItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("resumes a valid shortened session at its saved step", async () => {
    window.localStorage.setItem(
      ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
      JSON.stringify(savedSession(["ex-recognize", "ex-develop", "ex-produce"], 1)),
    );

    await mount();
    expect(container.textContent).toContain(copy.resumeDescription({ step: 2, total: 3 }));

    clickButtonWithText(copy.resumeSession);

    expect(container.textContent).toContain("develop-prompt");
    expect(container.textContent).toContain(copy.progress({ step: 2, total: 3 }));
  });

  it("does not resume a shortened-length session whose stages are out of order", async () => {
    window.localStorage.setItem(
      ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
      JSON.stringify(savedSession(["ex-recognize", "ex-organize", "ex-produce"], 1)),
    );

    await mount();

    expect(container.textContent).not.toContain(copy.resumeSession);
    expect(window.localStorage.getItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY)).toBeNull();
  });
});
