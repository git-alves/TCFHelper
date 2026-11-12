// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfigDisplay } from "@/lib/app-config";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { AdminApiKeysForm } = await import("./admin-api-keys-form");

const SECTION = {
  apiKeySet: false,
  apiKeyMasked: null,
  apiKeyFromEnv: false,
  model: null,
  modelDefault: "gemini-3.5-flash-lite",
  dailyLimit: 1000,
  dailyLimitDefault: 1000,
  dailyLimitIsDefault: true,
  requestsToday: 0,
};
const GEMINI_DISPLAY: AppConfigDisplay = {
  correctionProvider: "gemini",
  correction: { ...SECTION },
  exampleProvider: "gemini",
  example: { ...SECTION, modelDefault: "gemini-3.5-flash" },
};
const OPENROUTER_DISPLAY: AppConfigDisplay = {
  correctionProvider: "openrouter",
  correction: { ...SECTION, apiKeySet: true, apiKeyMasked: "••••1234", model: "qwen/qwen3-30b-a3b", modelDefault: "" },
  exampleProvider: "openrouter",
  example: { ...SECTION, apiKeySet: true, apiKeyMasked: "••••5678", model: "openai/gpt-4o-mini", modelDefault: "" },
};

const TYPED_KEY = "sk-or-v1-TYPEDKEYTYPEDKEY0123456789xy";

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function render(display: AppConfigDisplay) {
  act(() => {
    root.render(<AdminApiKeysForm initialDisplay={display} />);
  });
}

const sections = () => Array.from(container.querySelectorAll("fieldset"));
const section = (index: number) => sections()[index];
const field = (index: number, label: string) =>
  Array.from(section(index).querySelectorAll("label")).find((l) => l.textContent?.trim().startsWith(label))!;
const input = (index: number, label: string) =>
  section(index).querySelector<HTMLInputElement | HTMLSelectElement>(`#${CSS.escape(field(index, label).htmlFor)}`)!;
const buttons = (index: number, text: string) => Array.from(section(index).querySelectorAll("button")).filter((b) => b.textContent?.startsWith(text));
const testButton = (index: number) => buttons(index, "Test")[0] ?? buttons(index, "Testing")[0];
const result = (index: number) => section(index).querySelector('[data-testid="api-key-test-result"]');

function setValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

async function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => setValue(element, value));
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

const bodyOf = (call: number) => JSON.parse(((fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].body) as string);

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

describe("consumption bar", () => {
  it("shows today's provider calls and says that failed calls are included", () => {
    render({
      ...GEMINI_DISPLAY,
      correction: { ...GEMINI_DISPLAY.correction, requestsToday: 9, dailyLimit: 20 },
    });

    expect(container.textContent).toContain("9 / 20");
    expect(container.textContent).toContain("including ones that failed");
    expect(container.textContent).toContain("refused before the provider was called are not counted");
  });
});

describe("Test button", () => {
  it("there is one per section, idle, with no result", () => {
    render(GEMINI_DISPLAY);

    expect(sections()).toHaveLength(2);
    expect(testButton(0).textContent).toBe("Test");
    expect(testButton(1).textContent).toBe("Test");
    expect(result(0)).toBeNull();
    expect(container.textContent).toContain("Makes one small real call with the values above, saved or not.");
  });

  it("with nothing typed, sends the section, the provider and the model as shown, and no key", async () => {
    fetchMock.mockResolvedValue(json({ result: { ok: true, kind: "ok", message: "Works.", latencyMs: 5 }, tested: {} }));
    render(OPENROUTER_DISPLAY);

    await click(testButton(0));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/api-keys/test");
    expect(init.method).toBe("POST");
    expect(bodyOf(0)).toEqual({ section: "correction", provider: "openrouter", model: "qwen/qwen3-30b-a3b" });
  });

  it("tests the unsaved values: a typed key and a changed model go in the request", async () => {
    fetchMock.mockResolvedValue(json({ result: { ok: true, kind: "ok", message: "Works.", latencyMs: 5 }, tested: {} }));
    render(OPENROUTER_DISPLAY);
    await change(input(1, "API key"), `  ${TYPED_KEY}  `);
    await change(input(1, "Model"), "  meta-llama/llama-3.3-70b-instruct:free  ");

    await click(testButton(1));

    expect(bodyOf(0)).toEqual({
      section: "example",
      provider: "openrouter",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      apiKey: TYPED_KEY,
    });
  });

  it("sends an empty key when 'clear stored key' is ticked, as saving would", async () => {
    fetchMock.mockResolvedValue(json({ result: { ok: false, kind: "not_configured", message: "Nothing to test.", latencyMs: null }, tested: {} }));
    render(OPENROUTER_DISPLAY);
    await click(section(0).querySelector<HTMLInputElement>('input[type="checkbox"]')!);

    await click(testButton(0));

    expect(bodyOf(0).apiKey).toBe("");
  });

  it("is disabled and says 'Testing…' while the call runs, then shows a success result with latency and what was tested", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    render(OPENROUTER_DISPLAY);

    await click(testButton(0));

    expect(testButton(0).textContent).toBe("Testing…");
    expect(testButton(0).disabled).toBe(true);
    // The other section's button is unaffected.
    expect(testButton(1).disabled).toBe(false);
    await click(testButton(0)); // a second click while running does nothing
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish(
        json({
          result: { ok: true, kind: "ok", message: "Works. qwen/qwen3-30b-a3b answered in 1.2 s with structured JSON.", latencyMs: 1234 },
          tested: { summary: "Tested OpenRouter with the key saved in this panel and the model saved here." },
        }),
      );
    });

    expect(testButton(0).textContent).toBe("Test");
    expect(testButton(0).disabled).toBe(false);
    const box = result(0)!;
    expect(box.getAttribute("role")).toBe("status");
    expect(box.className).toContain("emerald");
    expect(box.textContent).toContain("Works. qwen/qwen3-30b-a3b answered in 1.2 s with structured JSON.");
    expect(box.textContent).toContain("Took 1,234 ms.");
    expect(box.textContent).toContain("Tested OpenRouter with the key saved in this panel and the model saved here.");
    expect(result(1)).toBeNull();
  });

  it("shows a failure in the error colour, as an alert", async () => {
    fetchMock.mockResolvedValue(
      json({ result: { ok: false, kind: "invalid_key", message: "OpenRouter rejected the API key (HTTP 401).", latencyMs: 210 }, tested: {} }),
    );
    render(OPENROUTER_DISPLAY);

    await click(testButton(0));

    const box = result(0)!;
    expect(box.getAttribute("role")).toBe("alert");
    expect(box.className).toContain("red");
    expect(box.textContent).toContain("OpenRouter rejected the API key (HTTP 401).");
  });

  it.each([
    ["a validation error", json({ error: "Essay correction: The API key looks too short: provider keys are at least 20 characters." }, 400), /too short/],
    ["the rate limit", json({ error: "Too many tests. Wait 30 seconds and try again.", code: "API_KEY_TEST_RATE_LIMITED" }, 429), /Too many tests/],
  ])("shows %s from the route as a failure", async (_label, response, message) => {
    fetchMock.mockResolvedValue(response);
    render(OPENROUTER_DISPLAY);

    await click(testButton(0));

    expect(result(0)!.getAttribute("role")).toBe("alert");
    expect(result(0)!.textContent).toMatch(message);
  });

  it("shows a message when the service cannot be reached, and a server error without a body", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(OPENROUTER_DISPLAY);
    await click(testButton(0));
    expect(result(0)!.textContent).toContain("Could not reach the admin service");

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => Promise.reject(new Error("x")) } as unknown as Response);
    await click(testButton(0));
    expect(result(0)!.textContent).toContain("Could not run the test");
  });

  it("drops a result as soon as the section is edited, so it never describes values that are no longer in the form", async () => {
    fetchMock.mockResolvedValue(json({ result: { ok: true, kind: "ok", message: "Works.", latencyMs: 5 }, tested: {} }));
    render(OPENROUTER_DISPLAY);
    await click(testButton(0));
    expect(result(0)).not.toBeNull();

    await change(input(0, "Model"), "openai/gpt-4o-mini");

    expect(result(0)).toBeNull();
  });

  it("never shows the typed key anywhere in the page or the result", async () => {
    fetchMock.mockResolvedValue(json({ result: { ok: false, kind: "invalid_key", message: "OpenRouter rejected the API key (HTTP 401).", latencyMs: 9 }, tested: {} }));
    render(OPENROUTER_DISPLAY);
    await change(input(0, "API key"), TYPED_KEY);

    await click(testButton(0));

    // A password field holds it; no text node shows it.
    expect(input(0, "API key").type).toBe("password");
    expect(container.textContent).not.toContain(TYPED_KEY);
  });
});

describe("switching a section's provider", () => {
  it("warns, before saving, that the saved key and model for this section will be removed", async () => {
    render(OPENROUTER_DISPLAY);

    await change(input(0, "AI Provider"), "gemini");

    const warning = section(0).querySelector('[role="status"]')!;
    expect(warning.textContent).toContain("Switching to Gemini Direct will remove the saved OpenRouter key and model for this section when you save.");
    // Only the section being switched warns.
    expect(section(1).querySelector('[role="status"]')).toBeNull();
  });

  it("empties the key and model inputs, and stops presenting the old key as this provider's", async () => {
    render(OPENROUTER_DISPLAY);
    expect((input(0, "Model") as HTMLInputElement).value).toBe("qwen/qwen3-30b-a3b");

    await change(input(0, "AI Provider"), "gemini");

    expect((input(0, "Model") as HTMLInputElement).value).toBe("");
    expect((input(0, "API key") as HTMLInputElement).value).toBe("");
    expect(section(0).textContent).toContain("No key is saved for this provider yet.");
    expect(section(0).textContent).not.toContain("••••1234");
    // Nothing to "clear on save": the switch already removes it.
    expect(section(0).querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("describes the new provider's model rules, not the saved provider's default", async () => {
    render(GEMINI_DISPLAY);

    await change(input(0, "AI Provider"), "openrouter");

    expect(section(0).textContent).toContain("Format: vendor/model");
    expect(section(0).textContent).toContain("Required -- this provider has no built-in default model.");
    expect(section(0).textContent).not.toContain("Default if left blank: gemini-3.5-flash-lite");
  });

  it("does not warn when there is nothing saved to remove", async () => {
    render(GEMINI_DISPLAY);

    await change(input(0, "AI Provider"), "openrouter");

    expect(section(0).querySelector('[role="status"]')).toBeNull();
  });

  it("switching back to the saved provider puts the saved key status and model back and removes the warning", async () => {
    render(OPENROUTER_DISPLAY);
    await change(input(0, "AI Provider"), "gemini");

    await change(input(0, "AI Provider"), "openrouter");

    expect(section(0).querySelector('[role="status"]')).toBeNull();
    expect((input(0, "Model") as HTMLInputElement).value).toBe("qwen/qwen3-30b-a3b");
    expect(section(0).textContent).toContain("Currently set here: ••••1234");
  });

  it("saves the switch with the new provider and no key, and shows the server's refusal when OpenRouter has no model", async () => {
    fetchMock.mockResolvedValue(json({ error: "Essay correction: OpenRouter has no default model, so choose one before switching to it (for example qwen/qwen3-30b-a3b)." }, 400));
    render(GEMINI_DISPLAY);
    await change(input(0, "AI Provider"), "openrouter");

    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const body = bodyOf(0);
    expect(body.correctionProvider).toBe("openrouter");
    expect(body.correctionModel).toBe("");
    expect(body).not.toHaveProperty("correctionApiKey");
    expect(body.exampleProvider).toBe("gemini");
    expect(container.querySelector('[role="alert"]')!.textContent).toContain("OpenRouter has no default model");
  });

  it("saves a switch with a typed key and model, which the server keeps", async () => {
    fetchMock.mockResolvedValue(json({ ...GEMINI_DISPLAY, correctionProvider: "openrouter" }));
    render(GEMINI_DISPLAY);
    await change(input(0, "AI Provider"), "openrouter");
    await change(input(0, "API key"), TYPED_KEY);
    await change(input(0, "Model"), "qwen/qwen3-30b-a3b");

    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(bodyOf(0)).toMatchObject({ correctionProvider: "openrouter", correctionApiKey: TYPED_KEY, correctionModel: "qwen/qwen3-30b-a3b" });
  });
});

describe("model help", () => {
  it("shows OpenRouter's model format", () => {
    render(OPENROUTER_DISPLAY);

    expect(section(0).textContent).toContain("Format: vendor/model, optionally :variant");
  });

  it("shows Gemini's model format", () => {
    render(GEMINI_DISPLAY);

    expect(section(0).textContent).toContain("Format: a single name with no slash");
  });

  it("states that a saved key takes precedence over the environment variable", () => {
    render(OPENROUTER_DISPLAY);

    expect(section(0).textContent).toContain("Currently set here: ••••1234 (takes precedence over OPENROUTER_API_KEY)");
  });
});
