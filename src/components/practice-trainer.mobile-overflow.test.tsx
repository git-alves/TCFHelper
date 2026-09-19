// @vitest-environment happy-dom
//
// Regression tests for two mobile-width overflow bugs found on the Train
// (Practice) screen: (1) selecting a task part with a long label made the
// whole setup grid wider than the viewport, because ThemedSelect's
// `truncate` (white-space: nowrap) selected-value span defeats CSS Grid's
// content-based auto-sizing unless the grid item itself has `min-w-0`; and
// (2) the Organize stage's full-text "Move up"/"Move down" buttons ate
// roughly half of each reorder row's width on narrow screens, squeezing
// exercise text into an unreadably narrow column. jsdom/happy-dom don't
// compute real layout, so these assert the specific fix markers rather than
// measured pixel widths -- the same class of guard used by this file's
// siblings for regressions that need a real browser to see visually.
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

const ORGANIZE_ORDER = ["First sentence.", "Second sentence.", "Third sentence.", "Fourth sentence."];

const LONG_LABEL_SKILL_ID = "skill-long-label";

const curriculum: CuratedPracticeCurriculum = {
  skills: [
    {
      id: LONG_LABEL_SKILL_ID,
      task: "TASK_1",
      level: "B2",
      part_order: 1,
      is_available: true,
      label: "Salutations",
      description:
        "Adapter la formule de salutation au destinataire in a sentence long enough to force min-content sizing",
      learning_outcome: "Choisir une salutation professionnelle appropriée.",
      estimated_minutes: 20,
    },
  ],
  exercises: [
    {
      id: "ex-recognize",
      task: "TASK_1",
      level: "B2",
      skill: LONG_LABEL_SKILL_ID,
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
      skill: LONG_LABEL_SKILL_ID,
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
      skill: LONG_LABEL_SKILL_ID,
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
      skill: LONG_LABEL_SKILL_ID,
      sub_skill: "openings",
      exercise_type: "organize",
      prompt: "p",
      instructions: "i",
      options: ORGANIZE_ORDER,
      correct_answer: ORGANIZE_ORDER,
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
      skill: LONG_LABEL_SKILL_ID,
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
      skill: LONG_LABEL_SKILL_ID,
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

describe("Practice setup grid on narrow screens", () => {
  it("keeps the part-selector fieldset from forcing the setup grid wider than the viewport", () => {
    act(() => {
      root.render(
        <AppLocaleProvider initialLocale="en">
          <PracticeTrainer curriculum={curriculum} />
        </AppLocaleProvider>,
      );
    });

    clickButtonWithText("Task 1");
    clickButtonWithText("B2");

    // ThemedSelect's closed-state label truncates with `white-space: nowrap`
    // (Tailwind's `truncate`), which gives it an unbounded min-content
    // contribution unless the CSS Grid item containing it opts out via
    // `min-w-0`. Losing this class re-introduces a real horizontal-overflow
    // bug on phone-width screens once a long part label is selected.
    const fieldset = container.querySelector('[data-walkthrough="practice-part-selector"]');
    expect(fieldset).not.toBeNull();
    expect(fieldset?.className).toMatch(/\bmin-w-0\b/);
  });
});

describe("Organize stage reorder controls on narrow screens", () => {
  beforeEach(() => {
    const session: StoredPracticeSession = {
      version: 1,
      task: "TASK_1",
      level: "B2",
      skillId: LONG_LABEL_SKILL_ID,
      exerciseIds: ["ex-recognize", "ex-complete", "ex-transform", "ex-organize", "ex-develop", "ex-produce"],
      currentExerciseIndex: 3,
      answer: "",
      ordering: [...ORGANIZE_ORDER].reverse(),
      checkState: null,
      completionMethods: [],
      difficultyRatings: [],
    };
    window.localStorage.setItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, JSON.stringify(session));
  });

  it("keeps Move up/down as compact, accessibly-labelled controls instead of full-width text buttons", async () => {
    act(() => {
      root.render(
        <AppLocaleProvider initialLocale="en">
          <PracticeTrainer curriculum={curriculum} />
        </AppLocaleProvider>,
      );
    });

    // Flush the loader's setTimeout(0), then resume into the saved session.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    clickButtonWithText(copy.resumeSession);

    const reorderList = container.querySelector(`[aria-label="${copy.reorderItems}"]`);
    expect(reorderList).not.toBeNull();

    const upButton = reorderList!.querySelector(`button[aria-label="${copy.moveUp}"]`);
    const downButton = reorderList!.querySelector(`button[aria-label="${copy.moveDown}"]`);
    expect(upButton).not.toBeNull();
    expect(downButton).not.toBeNull();

    // The full "Move up"/"Move down" text must still exist for larger
    // screens, but hidden on mobile in favour of a compact glyph -- losing
    // either span re-introduces either the mobile-width squeeze or a
    // regression for sighted desktop users.
    for (const button of [upButton!, downButton!]) {
      const icon = button.querySelector("span.sm\\:hidden");
      const label = button.querySelector("span.hidden.sm\\:inline");
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
      expect(label).not.toBeNull();
      expect(label?.textContent).toBeTruthy();
    }
  });
});
