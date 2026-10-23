// @vitest-environment happy-dom
//
// Clear all must be gated by a confirmation, only call the API once confirmed,
// and leave the visible history untouched when the request fails.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { CorrectionHistoryList } from "@/components/correction-history-list";
import type { CorrectionHistoryItem } from "@/lib/correction-history";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: refreshMock }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ITEMS: CorrectionHistoryItem[] = [
  {
    id: "essay_1",
    taskType: "TASK_2",
    wordCount: 135,
    createdAt: "2026-08-07T12:00:00.000Z",
    assessedAt: "2026-08-07T12:00:01.000Z",
    cefrLevel: "B2",
    meetsWordCount: true,
    topicTitle: "A forum post",
  },
  {
    id: "essay_2",
    taskType: "TASK_3",
    wordCount: 220,
    createdAt: "2026-08-06T12:00:00.000Z",
    assessedAt: "2026-08-06T12:00:01.000Z",
    cefrLevel: "C1",
    meetsWordCount: true,
    topicTitle: "A debate",
  },
];

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refreshMock.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn(async () => ({ ok: true, status: 204 }) as Response);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

function renderList() {
  act(() => {
    root.render(
      <AppLocaleProvider initialLocale="en">
        <CorrectionHistoryList items={ITEMS} />
      </AppLocaleProvider>,
    );
  });
}

function buttonWithText(text: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`button "${text}" not found`);
  return button;
}

async function click(text: string) {
  const button = buttonWithText(text);
  await act(async () => {
    button.click();
    await Promise.resolve();
  });
}

async function clickInDialog(text: string) {
  const dialog = document.querySelector('[role="alertdialog"]');
  const button = [...(dialog?.querySelectorAll("button") ?? [])].find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`dialog button "${text}" not found`);
  await act(async () => {
    button.click();
    await Promise.resolve();
  });
}

const historyLinkCount = () => container.querySelectorAll('a[href^="/dashboard/history/"]').length;

describe("CorrectionHistoryList clear all", () => {
  it("asks for confirmation and does not call the API until it is confirmed", async () => {
    renderList();

    await click("Clear all");

    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Clear all correction history?");
    expect(fetchMock).not.toHaveBeenCalled();

    await clickInDialog("Cancel");

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(historyLinkCount()).toBe(2);
  });

  it("sends DELETE /api/essays once confirmed, then shows the empty state and refreshes", async () => {
    renderList();

    await click("Clear all");
    await clickInDialog("Clear all");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/essays", { method: "DELETE" });
    expect(historyLinkCount()).toBe(0);
    expect(container.textContent).toContain("No corrections yet");
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Correction history cleared.");
    // The clear-all control is gone with the history it acted on.
    expect(container.textContent).not.toContain("Clear all");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the visible history and reports an error when the request fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 } as Response);
    renderList();

    await click("Clear all");
    await clickInDialog("Clear all");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(historyLinkCount()).toBe(2);
    expect(container.textContent).not.toContain("No corrections yet");
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Couldn't clear your correction history. Please try again.",
    );
    expect(buttonWithText("Clear all").disabled).toBe(false);
    // Reconciles with the server even on failure, like a single delete.
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the visible history when the network request rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    renderList();

    await click("Clear all");
    await clickInDialog("Clear all");

    expect(historyLinkCount()).toBe(2);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Couldn't clear");
  });
});
