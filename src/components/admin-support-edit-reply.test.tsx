// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const { AdminSupportEditReply } = await import("./admin-support-edit-reply");

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function render(note: string | null = "We fixed the editor.") {
  act(() => {
    root.render(<AdminSupportEditReply requestId="req_1" note={note} />);
  });
}

const button = (label: string) =>
  Array.from(container.querySelectorAll("button")).find((candidate) => candidate.textContent === label) ?? null;
const textarea = () => container.querySelector("textarea");
const alertText = () => container.querySelector('[role="alert"]')?.textContent ?? null;

async function click(label: string) {
  const target = button(label);
  if (!target) throw new Error(`No button "${label}"`);
  await act(async () => {
    target.click();
  });
}

function type(text: string) {
  const field = textarea()!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  refreshMock.mockReset();
  fetchMock = vi.fn().mockResolvedValue(response({ updated: true }));
  global.fetch = fetchMock as unknown as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AdminSupportEditReply", () => {
  it("opens an editor with the current reply, labelled for assistive technology", async () => {
    render();
    await click("Edit reply");

    const field = textarea()!;
    expect(field.value).toBe("We fixed the editor.");
    expect(field.getAttribute("aria-label")).toBeNull();
    const label = container.querySelector("label")!;
    expect(label.getAttribute("for")).toBe(field.id);
    expect(label.textContent).toBe("Reply to the learner");
  });

  it("sends the trimmed reply as a PATCH and refreshes on success", async () => {
    render();
    await click("Edit reply");
    type("  Clear your cache.  ");
    await click("Save reply");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/support/req_1/reply");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ note: "Clear your cache." });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(textarea()).toBeNull();
  });

  it("disables Save for a blank reply", async () => {
    render(null);
    await click("Edit reply");
    expect(button("Save reply")!.disabled).toBe(true);

    type("   ");
    expect(button("Save reply")!.disabled).toBe(true);
  });

  it("disables the field and both buttons while saving", async () => {
    let finish: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    render();
    await click("Edit reply");
    await click("Save reply");

    expect(button("Saving…")!.disabled).toBe(true);
    expect(button("Cancel")!.disabled).toBe(true);
    expect(textarea()!.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => finish(response({ updated: true })));
  });

  it("shows the server's error and keeps the draft for another try", async () => {
    fetchMock.mockResolvedValue(response({ error: "Invalid request." }, 400));
    render();
    await click("Edit reply");
    type("Clear your cache.");
    await click("Save reply");

    expect(alertText()).toBe("Invalid request.");
    expect(textarea()!.value).toBe("Clear your cache.");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows a generic error when the service cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render();
    await click("Edit reply");
    await click("Save reply");

    expect(alertText()).toBe("Could not edit this reply. Please try again.");
  });

  it("on 409 keeps the message visible and refreshes only when asked", async () => {
    fetchMock.mockResolvedValue(response({ error: "This reply can no longer be edited." }, 409));
    render();
    await click("Edit reply");
    await click("Save reply");

    expect(alertText()).toBe("This reply can no longer be edited.");
    expect(textarea()).toBeNull();
    expect(button("Edit reply")).toBeNull();
    expect(refreshMock).not.toHaveBeenCalled();

    await click("Refresh");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("Cancel discards the draft and any error", async () => {
    fetchMock.mockResolvedValue(response({ error: "Invalid request." }, 400));
    render();
    await click("Edit reply");
    type("Half-written");
    await click("Save reply");
    await click("Cancel");
    await click("Edit reply");

    expect(textarea()!.value).toBe("We fixed the editor.");
    expect(alertText()).toBeNull();
  });
});
