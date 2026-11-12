// @vitest-environment happy-dom
//
// A learner must never lose a draft to a failed or slow correction, a reload
// or a session that ended, and each failure must say what happened.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { DashboardNavGuardProvider } from "@/components/dashboard-nav-guard";
import { WalkthroughWorkspaceScriptProvider } from "@/components/walkthrough-workspace-script";
import { WritingWorkspace } from "@/components/writing-workspace";
import { CORRECTION_SLOW_LOADING_MS } from "@/components/correction-modal";
import { getAppCopy } from "@/lib/app-copy";
import type { AppLocale } from "@/lib/app-locale";
import {
  LEGACY_DRAFT_STORAGE_KEY,
  draftStorageKey,
  loadDrafts,
  resetDraftMemoryForTest,
  saveDraft,
  type SavedDraft,
} from "@/lib/draft-autosave";
import { installFakeLocalStorage } from "@/lib/draft-autosave.test-helpers";
import { getWalkthroughSampleFeedback } from "@/lib/walkthrough-sample-feedback";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DRAFT = Array.from(
  { length: 8 },
  () => "Je vous écris pour vous parler de mon quartier, qui est très agréable et dans lequel il y a beaucoup de commerces.",
).join(" ");
const TOPIC = {
  id: "topic_t2_1",
  taskType: "TASK_2",
  title: "Le télétravail",
  prompt: "Rédigez un article pour le journal interne de votre entreprise : racontez votre expérience du télétravail.",
  guideContext: { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "deterministic" },
};
const TOPIC_KEY = "TASK_2:recent:topic_t2_1";

let container: HTMLDivElement;
let root: Root;
let correctResponse: () => Promise<Response>;
let correctCalls: number;
let restoreStorage: (() => void) | undefined;
// The signed-in learner's internal id, as the tasks page passes it.
let currentUser: string | undefined;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function mountContainer() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  window.localStorage.clear();
  resetDraftMemoryForTest();
  currentUser = "user_a";
  mountContainer();
  correctCalls = 0;
  correctResponse = async () => json(502, {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/topics/random")) return json(200, { topic: TOPIC });
      if (url === "/api/essays/correct") {
        correctCalls += 1;
        return correctResponse();
      }
      return json(404, {});
    }),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  restoreStorage?.();
  restoreStorage = undefined;
});

function render(locale: AppLocale = "en") {
  act(() => {
    root.render(
      <AppLocaleProvider initialLocale={locale}>
        <DashboardNavGuardProvider>
          <WalkthroughWorkspaceScriptProvider>
            <WritingWorkspace key={currentUser} userId={currentUser} />
          </WalkthroughWorkspaceScriptProvider>
        </DashboardNavGuardProvider>
      </AppLocaleProvider>,
    );
  });
}

function remount(locale: AppLocale = "en") {
  act(() => root.unmount());
  container.remove();
  mountContainer();
  render(locale);
}

const button = (text: string | RegExp) =>
  [...document.querySelectorAll("button")].find((candidate) =>
    typeof text === "string" ? candidate.textContent?.trim().includes(text) : text.test(candidate.textContent ?? ""),
  );
async function click(element: Element | undefined) {
  if (!element) throw new Error("button not found");
  await act(async () => {
    (element as HTMLElement).click();
  });
  await act(async () => {
    await Promise.resolve();
  });
}
// The confirmation dialog's own button (its label can equal a button elsewhere on the page).
const dialogButton = (text: string) =>
  [...document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  );
const editor = () => document.getElementById("essay-content") as HTMLTextAreaElement | null;
function type(value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(editor(), value);
    editor()!.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const storedFor = (userId: string) =>
  JSON.parse(window.localStorage.getItem(draftStorageKey(userId)) ?? '{"drafts":[]}').drafts as SavedDraft[];
const stored = () => storedFor("user_a");

/** A learner on Tâche 2 with a random topic and a typed draft. */
async function startWriting(locale: AppLocale = "en") {
  const copy = getAppCopy(locale);
  render(locale);
  await click(button("Tâche 2"));
  await click(button(copy.workspace.topic.recentExamTitle));
  type(DRAFT);
  return copy;
}
async function submit(copy: ReturnType<typeof getAppCopy>) {
  await click(button(copy.workspace.editor.correct));
  await click(button(copy.workspace.dialog.correctConfirm));
}
const modalAlert = () => document.querySelector('[role="alert"]');
const draftRestore = () => document.querySelector('[data-testid="draft-restore"]');

describe("draft autosave and restore", () => {
  it("saves the draft, topic and task after a pause, and offers it back after a reload", async () => {
    const copy = await startWriting();
    expect(stored()).toEqual([]); // not before the pause
    await advance(700);

    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({
      key: TOPIC_KEY,
      taskType: "TASK_2",
      content: DRAFT,
      topic: { kind: "recent", id: "topic_t2_1", prompt: TOPIC.prompt },
    });

    remount();
    expect(draftRestore()?.textContent).toContain(copy.workspace.editor.draftRestoreMessage);
    expect(editor()).toBeNull(); // nothing chosen yet

    await click(button(copy.workspace.editor.draftRestoreAction));

    expect(editor()!.value).toBe(DRAFT);
    expect(container.textContent).toContain(TOPIC.prompt);
    expect(button("Tâche 2")?.getAttribute("aria-pressed")).toBe("true");
    expect(draftRestore()).toBeNull();
  });

  it("also saves a pasted topic and restores it as a custom topic", async () => {
    const copy = getAppCopy("en");
    render();
    await click(button("Tâche 1"));
    await click(button(copy.workspace.topic.customTitle));
    act(() => {
      const field = document.getElementById("custom-topic") as HTMLTextAreaElement;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(field, "Écrivez à votre voisin.");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    type(DRAFT);
    await advance(700);
    expect(stored()[0]).toMatchObject({ taskType: "TASK_1", topic: { kind: "custom", prompt: "Écrivez à votre voisin." } });

    remount();
    await click(button(copy.workspace.editor.draftRestoreAction));

    expect(editor()!.value).toBe(DRAFT);
    expect((document.getElementById("custom-topic") as HTMLTextAreaElement).value).toBe("Écrivez à votre voisin.");
  });

  it("writes a change that is still waiting out the pause when the workspace closes", async () => {
    await startWriting();
    // No pause has elapsed: leaving now must not lose the last keystrokes.
    act(() => root.unmount());
    expect(stored()[0]?.content).toBe(DRAFT);
    mountContainer(); // afterEach unmounts a root
  });

  it("keeps a draft per task and topic, offering the newest first, and the matching one once a topic is chosen", async () => {
    const older: SavedDraft = {
      key: TOPIC_KEY,
      taskType: "TASK_2",
      topic: { kind: "recent", id: "topic_t2_1", title: TOPIC.title, prompt: TOPIC.prompt, guideContext: TOPIC.guideContext as never },
      content: "Brouillon ancien pour la tâche deux.",
      savedAt: Date.now() - 2_000,
    };
    const newer: SavedDraft = {
      key: "TASK_1:custom:abc",
      taskType: "TASK_1",
      topic: { kind: "custom", prompt: "Écrivez à votre voisin." },
      content: "Brouillon récent pour la tâche un.",
      savedAt: Date.now() - 1_000,
    };
    saveDraft("user_a", older);
    saveDraft("user_a", newer);
    const copy = getAppCopy("en");

    render();
    await click(button(copy.workspace.editor.draftRestoreAction));
    expect(editor()!.value).toBe(newer.content);
    expect(button("Tâche 1")?.getAttribute("aria-pressed")).toBe("true");

    // Choosing Tâche 2's topic offers that topic's own draft, not the other.
    remount();
    await click(button("Discard"));
    expect(draftRestore()?.textContent).toContain(copy.workspace.editor.draftRestoreMessage); // the older one is next
    await click(button("Tâche 2"));
    await click(button(copy.workspace.topic.recentExamTitle));
    expect(draftRestore()).not.toBeNull();
    await click(button(copy.workspace.editor.draftRestoreAction));
    expect(editor()!.value).toBe(older.content);
  });

  it("does not offer a draft that belongs to a different topic once a topic is chosen", async () => {
    saveDraft("user_a", {
      key: "TASK_1:custom:abc",
      taskType: "TASK_1",
      topic: { kind: "custom", prompt: "Écrivez à votre voisin." },
      content: DRAFT,
      savedAt: Date.now() - 1_000,
    });
    const copy = getAppCopy("en");
    render();
    await click(button("Tâche 2"));
    await click(button(copy.workspace.topic.recentExamTitle));

    expect(draftRestore()).toBeNull();
  });

  it("deletes the saved draft when the learner chooses Discard", async () => {
    const copy = await startWriting();
    await advance(700);
    remount();

    await click(button(copy.workspace.editor.draftDiscardAction));

    expect(draftRestore()).toBeNull();
    expect(stored()).toEqual([]);
    remount();
    expect(draftRestore()).toBeNull();
  });

  it("does not offer a draft while there is already text in the editor", async () => {
    await startWriting();
    await advance(700);
    // Same visit, text present: no offer.
    expect(draftRestore()).toBeNull();
  });

  it("is cleared after a successful correction, and only then", async () => {
    const copy = await startWriting();
    await advance(700);

    // A failed correction keeps it.
    await submit(copy);
    expect(stored()).toHaveLength(1);
    expect(editor()!.value).toBe(DRAFT);

    // A successful one clears it.
    correctResponse = async () => json(200, { essayId: "essay_1", feedback: getWalkthroughSampleFeedback(copy) });
    await click(button(copy.workspace.correctionModal.tryAgain));
    expect(correctCalls).toBe(2);
    expect(stored()).toEqual([]);
    await advance(2_000);
    expect(stored()).toEqual([]); // no late write brings it back
  });

  it("is cleared when the learner confirms clearing the text, and kept when they cancel", async () => {
    const copy = await startWriting();
    await advance(700);

    await click(button(copy.workspace.editor.clear));
    await click(dialogButton(copy.workspace.dialog.cancel));
    expect(stored()).toHaveLength(1);
    expect(editor()!.value).toBe(DRAFT);

    await click(button(copy.workspace.editor.clear));
    await click(dialogButton(copy.workspace.dialog.clearDraftConfirm));
    expect(editor()!.value).toBe("");
    expect(stored()).toEqual([]);
  });

  it("is cleared when the learner confirms switching to another task", async () => {
    const copy = await startWriting();
    await advance(700);

    await click(button("Tâche 3"));
    await click(button(copy.workspace.dialog.confirm));

    expect(stored()).toEqual([]);
  });

  it("works when localStorage throws on every call, keeping the draft for the rest of the visit", async () => {
    const fake = installFakeLocalStorage({ failReads: true, failWrites: true });
    restoreStorage = fake.restore;
    const copy = await startWriting();
    await advance(700);
    expect(fake.calls.getItem).toBeGreaterThan(0);
    expect(fake.calls.setItem).toBeGreaterThan(0); // the blocked store really was tried
    expect(editor()!.value).toBe(DRAFT); // typing and autosaving did not break the editor
    expect(loadDrafts("user_a")).toHaveLength(1); // the per-tab copy

    remount();
    await click(button(copy.workspace.editor.draftRestoreAction));
    expect(editor()!.value).toBe(DRAFT);
  });

  it("works when the store is full, keeping at least the newest draft", async () => {
    const fake = installFakeLocalStorage({ failWrites: true });
    restoreStorage = fake.restore;
    await startWriting();
    await advance(700);

    expect(fake.calls.setItem).toBeGreaterThan(0);
    expect(editor()!.value).toBe(DRAFT);
    expect(loadDrafts("user_a")[0]?.content).toBe(DRAFT);
  });
});

describe("a browser shared by two learners", () => {
  async function writeAsUserA() {
    currentUser = "user_a";
    const copy = await startWriting();
    await advance(700);
    expect(storedFor("user_a")).toHaveLength(1);
    return copy;
  }
  function signInAs(userId: string | undefined) {
    currentUser = userId;
    remount();
  }

  it("offers learner B nothing of learner A's text, and gives A their own back", async () => {
    const copy = await writeAsUserA();

    signInAs("user_b");
    expect(draftRestore()).toBeNull();
    expect(editor()).toBeNull();
    expect(container.textContent).not.toContain("Je vous écris pour vous parler de mon quartier");
    // B's own work is stored apart and never touches A's.
    await click(button("Tâche 2"));
    await click(button(copy.workspace.topic.recentExamTitle));
    type("Le brouillon de B, qui est tout à fait différent.");
    await advance(700);
    expect(storedFor("user_b")[0]?.content).toBe("Le brouillon de B, qui est tout à fait différent.");
    expect(storedFor("user_a")[0]?.content).toBe(DRAFT);

    signInAs("user_a");
    expect(draftRestore()).not.toBeNull();
    await click(button(copy.workspace.editor.draftRestoreAction));
    expect(editor()!.value).toBe(DRAFT);
  });

  it("offers a draft only to a known learner: with no user id there is no restore offer and no autosave", async () => {
    await writeAsUserA();

    signInAs(undefined);
    expect(draftRestore()).toBeNull();

    const copy = getAppCopy("en");
    await click(button("Tâche 2"));
    await click(button(copy.workspace.topic.recentExamTitle));
    type("Du texte sans propriétaire connu.");
    await advance(700);
    act(() => root.unmount());
    mountContainer();

    expect(window.localStorage.getItem(draftStorageKey("undefined"))).toBeNull();
    expect(Object.keys({ ...window.localStorage }).filter((key) => key.startsWith("mytcflab:drafts"))).toEqual([
      draftStorageKey("user_a"),
    ]);
  });

  it("deletes the first version's ownerless drafts instead of offering them", async () => {
    window.localStorage.setItem(
      LEGACY_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        drafts: [
          {
            key: TOPIC_KEY,
            taskType: "TASK_2",
            topic: { kind: "recent", id: "topic_t2_1", title: TOPIC.title, prompt: TOPIC.prompt, guideContext: TOPIC.guideContext },
            content: "Texte d'un apprenant inconnu.",
            savedAt: Date.now(),
          },
        ],
      }),
    );

    render();
    await advance(0);

    expect(draftRestore()).toBeNull();
    expect(window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("keeps the in-memory copy per learner when storage is blocked, across a user switch", async () => {
    const fake = installFakeLocalStorage({ failReads: true, failWrites: true });
    restoreStorage = fake.restore;
    const copy = await writeAsUserAWithBlockedStorage();

    signInAs("user_b");
    expect(draftRestore()).toBeNull();
    expect(container.textContent).not.toContain("Je vous écris pour vous parler de mon quartier");

    signInAs("user_a");
    await click(button(copy.workspace.editor.draftRestoreAction));
    expect(editor()!.value).toBe(DRAFT);
  });

  async function writeAsUserAWithBlockedStorage() {
    currentUser = "user_a";
    const copy = await startWriting();
    await advance(700);
    expect(loadDrafts("user_a")).toHaveLength(1);
    return copy;
  }
});

describe("correction errors", () => {
  const cases: Array<{ name: string; response: () => Promise<Response> | Response; expected: (copy: ReturnType<typeof getAppCopy>) => string }> = [
    {
      name: "502",
      response: () => json(502, { error: "x" }),
      expected: (copy) => copy.workspace.editor.correctionBusyError.replaceAll("**", ""),
    },
    {
      name: "503",
      response: () => json(503, { error: "x" }),
      expected: (copy) => copy.workspace.editor.correctionBusyError.replaceAll("**", ""),
    },
    {
      name: "401",
      response: () => json(401, { error: "Unauthorized" }),
      expected: (copy) => copy.workspace.editor.correctionSessionExpiredError.replaceAll("**", ""),
    },
    {
      name: "504",
      response: () => new Response("<html>Gateway Timeout</html>", { status: 504 }),
      expected: (copy) => copy.workspace.editor.genericCorrectionError.replaceAll("**", ""),
    },
    {
      name: "400",
      response: () => json(400, { error: "Unknown topic." }),
      expected: (copy) => copy.workspace.editor.genericCorrectionError.replaceAll("**", ""),
    },
    {
      name: "a network error",
      response: () => {
        throw new TypeError("Failed to fetch");
      },
      expected: (copy) => copy.workspace.editor.genericCorrectionError.replaceAll("**", ""),
    },
  ];

  for (const locale of ["pt", "en"] as const) {
    for (const scenario of cases) {
      it(`${locale}: ${scenario.name} says what happened and keeps the draft, with a way to try again`, async () => {
        correctResponse = async () => scenario.response() as Response;
        const copy = await startWriting(locale);
        await submit(copy);

        const expected = scenario.expected(copy);
        expect(modalAlert()?.textContent).toBe(expected);
        // The same words sit under the editor.
        expect(
          [...document.querySelectorAll('[role="alert"]')].filter((node) => node.textContent === expected).length,
        ).toBeGreaterThanOrEqual(1);
        expect(editor()!.value).toBe(DRAFT);
        expect(button(copy.workspace.correctionModal.tryAgain)).toBeDefined();
        expect(container.textContent).not.toContain("**");
      });
    }
  }

  it("pt: shows the exact texts, with the draft sentence in bold", async () => {
    correctResponse = async () => json(503, {});
    const copy = await startWriting("pt");
    await submit(copy);
    const alert = modalAlert()!;
    expect(alert.textContent).toBe("O sistema está ocupado. Seu texto está salvo, tente de novo em um minuto.");
    expect(alert.querySelector("strong")?.textContent).toBe("Seu texto está salvo");

    correctResponse = async () => json(401, {});
    await click(button(copy.workspace.correctionModal.tryAgain));
    expect(modalAlert()!.textContent).toBe("Sua sessão expirou. Entre de novo para corrigir; seu texto está salvo.");
    expect(modalAlert()!.querySelector("strong")?.textContent).toBe("seu texto está salvo");
  });

  it("pt: the daily limit shows the exact text with the reset time in local time, and no Try again button", async () => {
    const resetAt = new Date("2026-11-13T00:00:00.000Z");
    correctResponse = async () =>
      json(429, { error: "x", code: "CORRECTION_DAILY_LIMIT_REACHED", resetAt: resetAt.toISOString() });
    const copy = await startWriting("pt");
    await submit(copy);

    const hh = String(resetAt.getHours()).padStart(2, "0");
    const mm = String(resetAt.getMinutes()).padStart(2, "0");
    const expected = `Você esgotou seu limite de correções de hoje. Ele voltará às ${hh}:${mm}.`;
    expect(modalAlert()?.textContent).toBe(expected);
    expect(button(copy.workspace.correctionModal.tryAgain)).toBeUndefined();
    expect(button(copy.common.close)).toBeDefined();
    expect(editor()!.value).toBe(DRAFT);
  });

  it("without a usable resetAt the daily limit still says so, without a time", async () => {
    correctResponse = async () => json(429, { error: "x", code: "CORRECTION_DAILY_LIMIT_REACHED" });
    const copy = await startWriting("pt");
    await submit(copy);

    expect(modalAlert()?.textContent).toBe("Você esgotou seu limite de correções de hoje. Ele voltará amanhã.");
    expect(button(copy.workspace.correctionModal.tryAgain)).toBeUndefined();
  });
});

describe("a long wait", () => {
  it("changes the loading text after 15 seconds, and not before", async () => {
    correctResponse = () => new Promise<Response>(() => {});
    const copy = await startWriting("pt");
    await submit(copy);

    const status = () => document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? "";
    expect(status()).toContain(copy.workspace.editor.correctingStatus);

    await advance(CORRECTION_SLOW_LOADING_MS - 1);
    expect(status()).toContain(copy.workspace.editor.correctingStatus);
    expect(status()).not.toContain("ainda tentando");

    await advance(1);
    expect(status()).toContain("O sistema está ocupado, ainda tentando…");
    expect(status()).not.toContain(copy.workspace.editor.correctingStatus);
  });

  it("starts the clock again for a retry", async () => {
    const copy = await startWriting("pt");
    await submit(copy); // 502: error state
    correctResponse = () => new Promise<Response>(() => {});
    await click(button(copy.workspace.correctionModal.tryAgain));

    await advance(CORRECTION_SLOW_LOADING_MS - 1);
    const status = () => document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? "";
    expect(status()).not.toContain("ainda tentando");
    await advance(1);
    expect(status()).toContain("ainda tentando");
  });
});
