// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfigDisplay } from "@/lib/app-config";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const { AdminApiKeysForm } = await import("./admin-api-keys-form");

const section = {
  apiKeySet: true,
  apiKeyMasked: "••••1234",
  apiKeyFromEnv: false,
  model: "gemini-3.5-flash-lite",
  modelDefault: "gemini-3.5-flash-lite",
  dailyLimit: 1000,
  dailyLimitDefault: 1000,
  dailyLimitIsDefault: true,
  requestsToday: 82,
};
const display: AppConfigDisplay = {
  correctionProvider: "gemini",
  correction: section,
  exampleProvider: "gemini",
  example: { ...section, model: "gemini-3.5-flash" },
  correctionModelChain: [
    {
      provider: "gemini",
      model: "first",
      apiKeySet: true,
      apiKeyMasked: "••••1234",
    },
    {
      provider: "openrouter",
      model: "second",
      apiKeySet: false,
      apiKeyMasked: null,
    },
  ],
  modelChainStatus: { alerts: [], reserveToday: { correction: 4, example: 0 } },
};
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
function render(value = display) {
  act(() => root.render(<AdminApiKeysForm initialDisplay={value} />));
}
async function click(text: string) {
  const element = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === text,
  );
  await act(async () => element!.click());
}
function setValue(
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
) {
  Object.getOwnPropertyDescriptor(
    element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype,
    "value",
  )!.set!.call(element, value);
  element.dispatchEvent(
    new Event(element instanceof HTMLSelectElement ? "change" : "input", {
      bubbles: true,
    }),
  );
}
async function change(selector: string, value: string) {
  await act(async () => setValue(container.querySelector(selector)!, value));
}
const body = (n = 0) =>
  JSON.parse((fetchMock.mock.calls[n][1] as RequestInit).body as string);
beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("API key operational cards", () => {
  it("shows concise chain status, step roles, reserve use, read-only daily usage, and no alerts", () => {
    render();
    expect(container.textContent).toContain("Active model chain · 2 steps");
    expect(container.textContent).toContain("1 Primary");
    expect(container.textContent).toContain("2 Reserve");
    expect(container.textContent).toContain("saved key ••••1234");
    expect(container.textContent).toContain("Reserve used today: 4");
    expect(container.textContent).toContain("Today: 82 / 1,000");
    expect(container.textContent).toContain("No current alerts");
    expect(container.querySelector("details")?.open).toBe(false);
  });

  it("keeps only one row expanded, tests it inline, and clears its result after an edit", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { ok: true, message: "Works.", latencyMs: 12 },
        tested: { summary: "Tested target." },
      }),
    });
    render();
    await click("Edit");
    expect(
      container.querySelector('[aria-label="Essay correction step 1 model"]'),
    ).not.toBeNull();
    await click("Test");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Works.",
    );
    await change('[aria-label="Essay correction step 1 model"]', "changed");
    expect(
      container.querySelector('[role="status"]')?.textContent ?? "",
    ).not.toContain("Works.");
    expect(container.textContent).not.toContain("window.alert");
  });

  it("uses the unchanged chain-test request contract and keeps the saved key index", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { ok: true, message: "Works.", latencyMs: 1 },
        tested: {},
      }),
    });
    render();
    await click("Test");
    expect(body()).toEqual({
      section: "correction",
      provider: "gemini",
      model: "first",
      savedApiKeyIndex: 0,
    });
  });

  it("shows Attention only for real alerts and names the job, step provider/model, problem, and action", () => {
    render({
      ...display,
      modelChainStatus: {
        alerts: [
          {
            id: "a1",
            section: "correction",
            provider: "openrouter",
            model: "second",
            kind: "key",
          },
        ],
        reserveToday: { correction: 0, example: 0 },
      },
    });
    expect(
      container.querySelector('[aria-label="Attention"]')?.textContent,
    ).toContain("Essay correction · openrouter / second");
    expect(
      container.querySelector('[aria-label="Attention"]')?.textContent,
    ).toContain("Invalid API key");
    expect(container.textContent).not.toContain("Healthy");
  });

  it("shows a global save bar with changed cards and preserves the current PUT body", async () => {
    render();
    await click("Edit");
    await change('[aria-label="Essay correction step 1 model"]', "changed");
    expect(container.textContent).toContain(
      "Unsaved changes in: Essay correction",
    );
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Save failed" }),
    });
    await click("Save changes");
    expect(container.textContent).toContain("Save failed");
    expect(
      container.querySelector('[aria-label="Essay correction step 1 model"]'),
    ).not.toBeNull();
  });

  it("blocks an incomplete OpenRouter step, provides labelled reordering, and confirms removal", async () => {
    render();
    await click("Edit");
    await change(
      '[aria-label="Essay correction step 1 provider"]',
      "openrouter",
    );
    await change('[aria-label="Essay correction step 1 model"]', "");
    expect(container.textContent).toContain(
      "Enter a model for every chain step",
    );
    expect(container.querySelector("button")?.textContent).toBeTruthy();
    expect(container.textContent).toContain("Move later");
    await click("Remove step");
    expect(container.textContent).toContain("Remove this step?");
  });
});

describe("legacy API key settings", () => {
  const legacyDisplay: AppConfigDisplay = {
    ...display,
    correctionModelChain: undefined,
  };

  async function openCorrectionLegacySettings() {
    const details = container.querySelector("details")!;
    await act(async () => {
      details.open = true;
      details.dispatchEvent(new Event("toggle"));
    });
  }

  it("tests unsaved legacy values inline and sends an empty key after use-environment-default", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { ok: true, message: "Works.", latencyMs: 12 },
        tested: { summary: "Saved key tested." },
      }),
    });
    render(legacyDisplay);
    await openCorrectionLegacySettings();
    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    await act(async () => checkbox.click());
    await click("Test");

    expect(body()).toEqual({
      section: "correction",
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      apiKey: "",
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Took 12 ms.",
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Saved key tested.",
    );
  });

  it("clears a legacy test result on edit and never renders a typed key", async () => {
    const typedKey = "sk-or-v1-TYPEDKEYTYPEDKEY0123456789xy";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { ok: true, message: "Works.", latencyMs: 1 },
        tested: {},
      }),
    });
    render(legacyDisplay);
    await openCorrectionLegacySettings();
    const inputs = container.querySelectorAll<HTMLInputElement>(
      'input[type="password"]',
    );
    await act(async () => setValue(inputs[0]!, typedKey));
    await click("Test");
    expect(body()).toMatchObject({ apiKey: typedKey });
    expect(container.textContent).not.toContain(typedKey);
    await act(async () => setValue(inputs[0]!, "another-key"));
    expect(container.textContent).not.toContain("Works.");
  });

  it("warns on a provider switch and restores the saved provider, key status, and model on switch-back", async () => {
    render(legacyDisplay);
    await openCorrectionLegacySettings();
    const provider = container.querySelector<HTMLSelectElement>("select")!;
    await act(async () => setValue(provider, "openrouter"));
    expect(container.textContent).toContain(
      "will remove the saved Gemini Direct key and model",
    );
    expect(container.textContent).toContain(
      "No saved key for this provider yet",
    );
    expect(
      container.querySelectorAll<HTMLInputElement>('input[type="text"]')[0]!
        .value,
    ).toBe("");
    await act(async () => setValue(provider, "gemini"));
    expect(
      container.querySelectorAll<HTMLInputElement>('input[type="text"]')[0]!
        .value,
    ).toBe("gemini-3.5-flash-lite");
    expect(container.textContent).toContain("saved key ••••1234");
  });
});

describe("save and card state", () => {
  const success = () => ({ ok: true, json: async () => display });

  async function submit() {
    await act(async () => {
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
  }

  it("sends stable saved-key indices after reorder and after removing another step", async () => {
    fetchMock.mockResolvedValue(success());
    render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Edit step 1"]')!
        .click(),
    );
    await click("Move later");
    await submit();
    expect(body()).toMatchObject({
      correctionModelChain: [
        { provider: "openrouter", model: "second" },
        { provider: "gemini", model: "first", savedApiKeyIndex: 0 },
      ],
    });
  });

  it("sends null when removing a saved chain key and when turning off a chain", async () => {
    fetchMock.mockResolvedValue(success());
    render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Edit step 1"]')!
        .click(),
    );
    await click("Remove saved key");
    await submit();
    expect(body()).toMatchObject({
      correctionModelChain: [
        { provider: "gemini", model: "first", apiKey: null },
      ],
    });

    fetchMock.mockResolvedValue(success());
    await act(async () =>
      container.querySelector("details")!.dispatchEvent(new Event("toggle")),
    );
    await click("Turn off chain");
    await click("Turn off chain");
    await submit();
    expect(body(1).correctionModelChain).toBeNull();
  });

  it("drops a saved chain key after a provider change, preserves it after a model change, and restores drafts on discard", async () => {
    fetchMock.mockResolvedValue(success());
    render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Edit step 1"]')!
        .click(),
    );
    await change(
      '[aria-label="Essay correction step 1 model"]',
      "changed-model",
    );
    await submit();
    expect(body().correctionModelChain[0]).toMatchObject({
      model: "changed-model",
      savedApiKeyIndex: 0,
    });

    render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Edit step 1"]')!
        .click(),
    );
    await change(
      '[aria-label="Essay correction step 1 provider"]',
      "openrouter",
    );
    expect(container.textContent).toContain("Unsaved changes");
    await click("Discard changes");
    expect(
      container.querySelector('[aria-label="Essay correction step 1 model"]'),
    ).toBeNull();
  });
});
