// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { PracticeTrainer } from "@/components/practice-trainer";
import { PRACTICE_DRAFT_STORAGE_KEY } from "@/lib/practice-draft-storage";
import { SECTIONED_PRACTICE_EXERCISES, getSectionedPracticeExercise } from "@/lib/sectioned-practice";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let fetchCalls: { url: string; body: unknown }[];

beforeEach(() => {
  searchParams = new URLSearchParams();
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body as string) : null });
      if (url === "/api/practice/sessions") {
        return { ok: true, status: 201, json: async () => ({ sessionId: "session_1" }) } as Response;
      }
      return { ok: true, status: 201, json: async () => ({ sequenceCompleted: true }) } as Response;
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

async function render() {
  await act(async () => {
    root.render(
      <AppLocaleProvider initialLocale="en">
        <PracticeTrainer exercises={SECTIONED_PRACTICE_EXERCISES} />
      </AppLocaleProvider>,
    );
  });
}

function button(text: string | RegExp) {
  const match = [...container.querySelectorAll("button")].find((candidate) => {
    const content = candidate.textContent?.trim() ?? "";
    return typeof text === "string" ? content.startsWith(text) : text.test(content);
  });
  if (!match) throw new Error(`button ${String(text)} not found`);
  return match;
}

async function click(text: string | RegExp) {
  const target = button(text);
  await act(async () => {
    target.click();
    await Promise.resolve();
  });
}

function textarea(index: number) {
  return container.querySelectorAll("textarea")[index] as HTMLTextAreaElement;
}

async function type(index: number, value: string) {
  const element = textarea(index);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function startTask1B2() {
  await render();
  await click("Task 1");
  await click("B2");
  await click("Start the exercise");
}

const sessionCalls = () => fetchCalls.filter((call) => call.url === "/api/practice/sessions");
const completionCalls = () => fetchCalls.filter((call) => call.url.endsWith("/completions"));

describe("PracticeTrainer", () => {
  it("unlocks levels after a task, then previews the three sections with their word ranges", async () => {
    await render();

    expect(button("B2").disabled).toBe(true);
    expect(container.textContent).not.toContain("Start the exercise");

    await click("Task 2");
    expect(button("B2").disabled).toBe(false);
    await click("C1");

    const preview = container.querySelector('[data-walkthrough="practice-stages-preview"]')!;
    expect(preview.textContent).toContain("Un voyage seul à l'étranger");
    expect(preview.textContent).toContain("Present the situation");
    expect(preview.textContent).toContain("20–30 words");
    expect(preview.textContent).toContain("Recount the events");
    expect(preview.textContent).toContain("45–60 words");
    expect(preview.textContent).toContain("Comment and conclude");
    expect(preview.textContent).toContain("40–55 words");
  });

  it("shows one writing box per section, with a live word count against that section's range", async () => {
    await startTask1B2();

    expect(container.querySelectorAll("textarea")).toHaveLength(3);
    expect(container.textContent).toContain("Un nouvel appartement");
    expect(container.textContent).toContain("Inviter Camille (date et heure)");
    expect(container.textContent).toContain("0 words · target 10–15");

    await type(0, "Salut Camille, j'ai enfin déménagé pour de bon !");

    expect(container.textContent).toContain("9 words · target 10–15");
    expect(container.textContent).toContain("0 words · target 50–70");
    // No model answer until the learner asks for it.
    expect(container.textContent).not.toContain("Model answer");
  });

  it("shows Tâche 3's two documents and the position example", async () => {
    await render();
    await click("Task 3");
    await click("B2");
    await click("Start the exercise");

    expect(container.textContent).toContain("Document 1 — Un salarié");
    expect(container.textContent).toContain("Document 2 — Une responsable d'équipe");
    expect(container.textContent).toContain("le télétravail présente de vrais avantages");
    expect(container.querySelectorAll("textarea")).toHaveLength(3);
  });

  it("reveals the model answer for one section without touching the learner's draft or recording progress yet", async () => {
    await startTask1B2();
    await type(0, "Salut Camille, j'ai une nouvelle !");

    await click("Show model answer");

    const exercise = getSectionedPracticeExercise("t1-b2-new-flat")!;
    expect(container.textContent).toContain(exercise.modelAnswers[0]);
    expect(container.textContent).not.toContain(exercise.modelAnswers[1]);
    expect(textarea(0).value).toBe("Salut Camille, j'ai une nouvelle !");
    expect(container.textContent).toContain("1 of 3 model answers viewed");
    expect(fetchCalls).toHaveLength(0);
  });

  it("records one independent completion once every section was written before its model was shown", async () => {
    await startTask1B2();
    for (let index = 0; index < 3; index += 1) {
      await type(index, "du texte écrit");
      await click("Show model answer");
    }

    expect(sessionCalls()).toEqual([
      { url: "/api/practice/sessions", body: { task: "TASK_1", level: "B2", exerciseId: "t1-b2-new-flat" } },
    ]);
    expect(completionCalls()).toEqual([
      {
        url: "/api/practice/sessions/session_1/completions",
        body: { exerciseId: "t1-b2-new-flat", completionMethod: "self-review" },
      },
    ]);
    expect(container.textContent).toContain("You have compared every section.");
    expect(container.textContent).toContain("Keep the model's moves in mind");
  });

  it("records the completion as assisted when a model answer was shown before writing", async () => {
    await startTask1B2();
    await type(0, "du texte");
    await click("Show model answer");
    await click("Show model answer"); // section 2, left empty
    await type(2, "du texte");
    await click("Show model answer");

    expect(completionCalls().map((call) => call.body)).toEqual([
      { exerciseId: "t1-b2-new-flat", completionMethod: "revealed" },
    ]);
    expect(container.textContent).toContain("You viewed at least one model answer before writing");
  });

  it("restarts with blank sections and a fresh progress record", async () => {
    await startTask1B2();
    for (let index = 0; index < 3; index += 1) {
      await type(index, "du texte");
      await click("Show model answer");
    }

    await click("Practise again");

    expect(textarea(0).value).toBe("");
    expect(container.textContent).not.toContain("You have compared every section.");

    for (let index = 0; index < 3; index += 1) {
      await type(index, "du texte");
      await click("Show model answer");
    }
    expect(sessionCalls()).toHaveLength(2);
    expect(completionCalls()).toHaveLength(2);
  });

  it("restores an unfinished exercise and its drafts after a refresh", async () => {
    await startTask1B2();
    await type(1, "Mon appartement est près du parc.");
    act(() => {
      root.unmount();
    });
    root = createRoot(container);

    await render();

    expect(container.textContent).toContain("Un nouvel appartement");
    expect(textarea(1).value).toBe("Mon appartement est près du parc.");
  });

  it("ignores a saved draft for an exercise that no longer exists", async () => {
    window.localStorage.setItem(
      PRACTICE_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 1, exerciseId: "retired", answers: ["a", "b", "c"], reveals: [null, null, null] }),
    );

    await render();

    expect(container.textContent).toContain("Choose a task");
  });

  it("asks before leaving an exercise with unsaved writing, and keeps the text if the learner stays", async () => {
    await startTask1B2();
    await type(0, "du texte");

    await click("← Choose another exercise");
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Leave this exercise?");

    await click("Keep writing");
    expect(textarea(0).value).toBe("du texte");

    await click("← Choose another exercise");
    await click("Discard and leave");
    expect(container.textContent).toContain("Choose a task");
    expect(window.localStorage.getItem(PRACTICE_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("leaves immediately when nothing has been written", async () => {
    await startTask1B2();

    await click("← Choose another exercise");

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(container.textContent).toContain("Choose a task");
  });

  it("preselects Task 1 / B2 during the app tour so its preview step has a target", async () => {
    searchParams = new URLSearchParams("walkthrough=full");

    await render();

    expect(container.querySelector('[data-walkthrough="practice-stages-preview"]')).not.toBeNull();
  });
});
