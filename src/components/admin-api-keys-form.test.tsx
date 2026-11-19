// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfigDisplay } from "@/lib/app-config";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const { AdminApiKeysForm } = await import("./admin-api-keys-form");

const section = { apiKeySet: true, apiKeyMasked: "••••1234", apiKeyFromEnv: false, model: "gemini-3.5-flash-lite", modelDefault: "gemini-3.5-flash-lite", dailyLimit: 1000, dailyLimitDefault: 1000, dailyLimitIsDefault: true, requestsToday: 82 };
const display: AppConfigDisplay = { correctionProvider: "gemini", correction: section, exampleProvider: "gemini", example: { ...section, model: "gemini-3.5-flash" }, correctionModelChain: [{ provider: "gemini", model: "first", apiKeySet: true, apiKeyMasked: "••••1234" }, { provider: "openrouter", model: "second", apiKeySet: false, apiKeyMasked: null }], modelChainStatus: { alerts: [], reserveToday: { correction: 4, example: 0 } } };
let root: Root; let container: HTMLDivElement; let fetchMock: ReturnType<typeof vi.fn>;
function render(value = display) { act(() => root.render(<AdminApiKeysForm initialDisplay={value} />)); }
async function click(text: string) { const element = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === text); await act(async () => element!.click()); }
function setValue(element: HTMLInputElement | HTMLSelectElement, value: string) { Object.getOwnPropertyDescriptor(element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(element, value); element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })); }
async function change(selector: string, value: string) { await act(async () => setValue(container.querySelector(selector)!, value)); }
const body = (n = 0) => JSON.parse((fetchMock.mock.calls[n][1] as RequestInit).body as string);
beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock as unknown as typeof fetch; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

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
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { ok: true, message: "Works.", latencyMs: 12 }, tested: { summary: "Tested target." } }) });
    render();
    await click("Edit");
    expect(container.querySelector('[aria-label="Essay correction step 1 model"]')).not.toBeNull();
    await click("Test");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Works.");
    await change('[aria-label="Essay correction step 1 model"]', "changed");
    expect(container.querySelector('[role="status"]')?.textContent).not.toContain("Works.");
    expect(container.textContent).not.toContain("window.alert");
  });

  it("uses the unchanged chain-test request contract and keeps the saved key index", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { ok: true, message: "Works.", latencyMs: 1 }, tested: {} }) });
    render();
    await click("Test");
    expect(body()).toEqual({ section: "correction", provider: "gemini", model: "first", savedApiKeyIndex: 0 });
  });

  it("shows Attention only for real alerts and names the job, step provider/model, problem, and action", () => {
    render({ ...display, modelChainStatus: { alerts: [{ id: "a1", section: "correction", provider: "openrouter", model: "second", kind: "key" }], reserveToday: { correction: 0, example: 0 } } });
    expect(container.querySelector('[aria-label="Attention"]')?.textContent).toContain("Essay correction · openrouter / second");
    expect(container.querySelector('[aria-label="Attention"]')?.textContent).toContain("Invalid API key");
    expect(container.textContent).not.toContain("Healthy");
  });

  it("shows a global save bar with changed cards and preserves the current PUT body", async () => {
    render();
    await click("Edit");
    await change('[aria-label="Essay correction step 1 model"]', "changed");
    expect(container.textContent).toContain("Unsaved changes in: Essay correction");
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Save failed" }) });
    await click("Save changes");
    expect(container.textContent).toContain("Save failed");
    expect(container.querySelector('[aria-label="Essay correction step 1 model"]')).not.toBeNull();
  });

  it("blocks an incomplete OpenRouter step, provides labelled reordering, and confirms removal", async () => {
    render();
    await click("Edit");
    await change('[aria-label="Essay correction step 1 provider"]', "openrouter");
    expect(container.textContent).toContain("Complete each OpenRouter model");
    expect(container.querySelector("button")?.textContent).toBeTruthy();
    expect(container.textContent).toContain("Move later");
    await click("Remove step");
    expect(container.textContent).toContain("Remove this step?");
  });
});
