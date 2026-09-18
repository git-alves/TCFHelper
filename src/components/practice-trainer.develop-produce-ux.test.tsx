// @vitest-environment happy-dom
//
// Regression tests for the Develop/Produce UX work:
// 1. A live word/sentence counter, since the length target ("80 à 100 mots")
//    lives only as prose in the instructions with no other feedback signal.
// 2. Develop gets an optional, ungraded structure aid (Context / Objective)
//    that never gates or replaces the free-write textarea.
// 3. Produce requires a mandatory, ungraded mini-plan (main idea, two
//    points, conclusion) before the response field unlocks; once unlocked
//    (or resumed with existing text), it stays unlocked even if the plan is
//    later edited.
// 4. Self-review no longer permanently locks the exercise -- both the plan
//    and the response stay editable, and editing either un-commits the
//    verdict until self-review runs again.
// 5. An explicit note that the exercise content is French exam material.
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
      id: "ex-develop",
      task: "TASK_1",
      level: "B2",
      skill: "skill-1",
      sub_skill: "openings",
      exercise_type: "develop",
      prompt: "Vous écrivez au service des objets trouvés.",
      instructions: "Rédigez deux phrases d'ouverture.",
      accepted_answers: [],
      explanation: "Votre ouverture doit être claire.",
      target_language_feature: "but et contexte",
      difficulty: 5,
      sequence_order: 5,
      tags: [],
      self_check: ["J'annonce clairement le but du message."],
    },
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

function textarea(): HTMLTextAreaElement | null {
  return container.querySelector("textarea");
}

function requireTextarea(): HTMLTextAreaElement {
  const el = textarea();
  if (!el) throw new Error("textarea not found");
  return el;
}

function typeAnswer(text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(requireTextarea(), text);
    requireTextarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function fillInputByLabel(labelText: string, value: string) {
  const label = [...container.querySelectorAll("label")].find((el) => el.textContent?.startsWith(labelText));
  if (!label) throw new Error(`label "${labelText}" not found`);
  const input = label.querySelector("input");
  if (!input) throw new Error(`input for label "${labelText}" not found`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function fillProducePlan(overrides: Partial<Record<"mainIdea" | "point1" | "point2" | "conclusion", string>> = {}) {
  fillInputByLabel(copy.producePlanMainIdeaLabel, overrides.mainIdea ?? "Reporter mon inscription");
  fillInputByLabel(copy.producePlanPoint1Label, overrides.point1 ?? "Raison du report");
  fillInputByLabel(copy.producePlanPoint2Label, overrides.point2 ?? "Nouvelle date souhaitée");
  fillInputByLabel(copy.producePlanConclusionLabel, overrides.conclusion ?? "Demande de confirmation");
}

function startSequence() {
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

function advanceFromDevelopToProduce() {
  typeAnswer("Madame, Monsieur, je vous écris.");
  clickButtonWithText(copy.selfReview);
  clickButtonWithText(copy.nextExercise);
}

describe("PracticeTrainer: Develop/Produce UX", () => {
  it("shows the exam-task language note above the French prompt", () => {
    startSequence();

    expect(container.textContent).toContain(copy.examTaskLanguageNote);
  });

  it("Develop: the structure aid is optional and collapsed by default; the main textarea works without it", () => {
    startSequence();

    expect(container.textContent).not.toContain(copy.developContextLabel);
    expect(requireTextarea().disabled).toBe(false);

    typeAnswer("Bonjour. Comment allez-vous");
    expect(container.textContent).toContain(copy.lengthCounter({ words: 3, sentences: 2 }));

    clickButtonWithText(copy.developShowStructureAid);
    expect(container.textContent).toContain(copy.developContextLabel);
    expect(container.textContent).toContain(copy.developStructureExampleText);
  });

  it("Produce: the response field stays locked until the full mini-plan is filled in", () => {
    startSequence();
    advanceFromDevelopToProduce();

    expect(textarea()).toBeNull();
    expect(container.textContent).toContain(copy.producePlanRequiredNotice);

    fillInputByLabel(copy.producePlanMainIdeaLabel, "Reporter mon inscription");
    fillInputByLabel(copy.producePlanPoint1Label, "Raison du report");
    fillInputByLabel(copy.producePlanPoint2Label, "Nouvelle date souhaitée");
    expect(textarea()).toBeNull();

    fillInputByLabel(copy.producePlanConclusionLabel, "Demande de confirmation");
    expect(textarea()).not.toBeNull();
  });

  it("Produce: stays unlocked once a response exists, even if a plan field is cleared afterward", () => {
    startSequence();
    advanceFromDevelopToProduce();

    fillProducePlan();
    typeAnswer("Je vous contacte car je souhaite reporter mon inscription.");

    fillInputByLabel(copy.producePlanMainIdeaLabel, "");

    expect(textarea()).not.toBeNull();
    expect(requireTextarea().value).toBe("Je vous contacte car je souhaite reporter mon inscription.");
  });

  it("keeps the plan and response editable after self-review, and includes the plan in the self-review recap", () => {
    startSequence();
    advanceFromDevelopToProduce();

    fillProducePlan();
    typeAnswer("Je vous contacte car je souhaite reporter mon inscription.");
    clickButtonWithText(copy.selfReview);

    // Recap of the (ungraded) plan, the self-check, and the finish action
    // all appear together -- not a one-shot final verdict.
    expect(requireTextarea().disabled).toBe(false);
    expect(container.textContent).toContain(copy.producePlanRecapLabel);
    expect(container.textContent).toContain("Reporter mon inscription");
    expect(container.textContent).toContain("Le but du message est clair");
    expect(container.textContent).toContain(copy.finishSequence);

    // Editing the response un-commits the verdict.
    typeAnswer("Je vous contacte car je souhaite reporter mon inscription à l'année prochaine.");
    expect(container.textContent).not.toContain(copy.producePlanRecapLabel);
    expect(container.textContent).not.toContain(copy.finishSequence);

    clickButtonWithText(copy.selfReview);
    expect(container.textContent).toContain(copy.finishSequence);

    // Editing the plan (not just the response) also un-commits the verdict.
    fillInputByLabel(copy.producePlanConclusionLabel, "Demande de confirmation écrite");
    expect(container.textContent).not.toContain(copy.finishSequence);
  });

  it("does not report a self-review completion to the server until the learner clicks Next", async () => {
    const completionCalls: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/practice/sessions") {
          return { ok: true, json: async () => ({ sessionId: "sess-1" }) } as Response;
        }
        if (url.includes("/completions")) {
          completionCalls.push(init?.body ? JSON.parse(init.body as string) : null);
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    startSequence();
    // Let beginProgressSession's fetch chain resolve so it actually has a
    // session id to report against, instead of only queuing locally.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    typeAnswer("Madame, Monsieur, je vous écris.");
    clickButtonWithText(copy.selfReview);

    expect(completionCalls).toHaveLength(0);

    clickButtonWithText(copy.nextExercise);
    await act(async () => {
      await Promise.resolve();
    });

    expect(completionCalls).toHaveLength(1);
    expect(completionCalls[0]).toMatchObject({ exerciseId: "ex-develop", completionMethod: "self-review" });
  });
});
