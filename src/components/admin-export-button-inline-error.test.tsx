// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminExportCsvButton } from "./admin-export-csv-button";

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
let createObjectURL: ReturnType<typeof vi.fn>;
let downloaded: string[];

function render() {
  act(() => {
    root.render(
      <AdminExportCsvButton
        href="/api/admin/logs/export?severity=ERROR"
        label="Export .txt"
        fallbackFilename="tcflab-logs.txt"
        hint="Exports all events matching the current filters."
      />,
    );
  });
}

async function click() {
  await act(async () => {
    container.querySelector("button")!.click();
  });
}

beforeEach(() => {
  downloaded = [];
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  createObjectURL = vi.fn(() => "blob:mock");
  URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  // Record the download instead of navigating.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloaded.push(this.download);
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("AdminExportCsvButton as the log's .txt export", () => {
  it("shows its label and the hint about what is exported", () => {
    render();

    expect(container.textContent).toContain("Export .txt");
    expect(container.textContent).toContain("Exports all events matching the current filters.");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("requests the export href with the current filters and downloads the file under the server's name", async () => {
    fetchMock.mockResolvedValue(
      new Response("log\n", {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="tcflab-logs-2026-11-14-1032.txt"' },
      }),
    );
    render();

    await click();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/logs/export?severity=ERROR");
    expect(downloaded).toEqual(["tcflab-logs-2026-11-14-1032.txt"]);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows the refusal inline and downloads nothing when too many events match", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "More than 5,000 events match, the export limit. Narrow the date range or filters before exporting." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render();

    await click();

    expect(container.querySelector('[role="alert"]')!.textContent).toContain("Narrow the date range");
    expect(downloaded).toEqual([]);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("shows a message inline when the service cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render();

    await click();

    expect(container.querySelector('[role="alert"]')!.textContent).toContain("Could not reach the admin service");
    expect(downloaded).toEqual([]);
  });

  it("clears an earlier error when the next try succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(new Response("log\n", { status: 200 }));
    render();

    await click();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await click();

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(downloaded).toEqual(["tcflab-logs.txt"]);
  });
});
