// @vitest-environment happy-dom
//
// Regression test for resuming a saved "organize" session whose persisted
// ordering already equals correct_answer -- e.g. a session saved before
// 6291776 (which scrambles ordering on fresh entry, but never touched what
// was already on disk). Without re-checking on resume, such a session could
// still let "Check" pass with zero reordering. Mounts the real
// PracticeTrainer against a pre-seeded localStorage session, the same
// happy-dom + act pattern used elsewhere in this file's siblings.
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

const ORGANIZE_CORRECT_ORDER = ["First sentence.", "Second sentence.", "Third sentence.", "Fourth sentence."];

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
      id: "ex-recognize",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "recognize",
      prompt: "p",
      instructions: "i",
      options: ["A", "B"],
      correct_answer: "A",
      explanation: "e",
      target_language_feature: "f",
      difficulty: 1,
      sequence_order: 1,
      tags: [],
    },
    {
      id: "ex-complete",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "complete",
      prompt: "p",
      instructions: "i",
      correct_answer: "answer",
      explanation: "e",
      target_language_feature: "f",
      difficulty: 1,
      sequence_order: 1,
      tags: [],
    },
    {
      id: "ex-transform",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "transform",
      prompt: "p",
      instructions: "i",
      correct_answer: "answer",
      explanation: "e",
      target_language_feature: "f",
      difficulty: 1,
      sequence_order: 1,
      tags: [],
    },
    {
      id: "ex-organize",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "organize",
      prompt: "p",
      instructions: "i",
      options: ORGANIZE_CORRECT_ORDER,
      correct_answer: ORGANIZE_CORRECT_ORDER,
      explanation: "e",
      target_language_feature: "f",
      difficulty: 1,
      sequence_order: 1,
      tags: [],
    },
    {
      id: "ex-develop",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "develop",
      prompt: "p",
      instructions: "i",
      explanation: "e",
      target_language_feature: "f",
      difficulty: 1,
      sequence_order: 1,
      tags: [],
    },
    {
      id: "ex-produce",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "produce",
      prompt: "p",
      instructions: "i",
      explanation: "e",
      target_language_feature: "f",
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

  // A session "saved" while already sitting on the organize stage, with its
  // ordering equal to correct_answer -- the shape a pre-6291776 session
  // would have had, since entry didn't scramble it back then.
  const preSolvedSession: StoredPracticeSession = {
    version: 1,
    task: "TASK_1",
    level: "B2",
    skillId: "skill-1",
    exerciseIds: ["ex-recognize", "ex-complete", "ex-transform", "ex-organize", "ex-develop", "ex-produce"],
    currentExerciseIndex: 3,
    answer: "",
    ordering: ORGANIZE_CORRECT_ORDER,
    checkState: null,
    completionMethods: [],
    difficultyRatings: [],
  };
  window.localStorage.setItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, JSON.stringify(preSolvedSession));
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

function renderedOrdering(): string[] {
  return [...container.querySelectorAll('[aria-label="Reorder the items"] p')].map(
    (item) => item.textContent ?? "",
  );
}

describe("PracticeTrainer: resuming a pre-solved saved organize session", () => {
  it("re-scrambles instead of resuming an already-correct saved ordering", async () => {
    act(() => {
      root.render(
        <AppLocaleProvider initialLocale="en">
          <PracticeTrainer curriculum={curriculum} />
        </AppLocaleProvider>,
      );
    });

    // Flush the loader's setTimeout(0).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    clickButtonWithText(copy.resumeSession);

    expect(renderedOrdering()).not.toEqual(ORGANIZE_CORRECT_ORDER);
  });
});
