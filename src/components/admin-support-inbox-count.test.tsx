// @vitest-environment happy-dom
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { AdminSupportInboxProvider, AdminSupportInboxSeen, useAdminSupportInbox } = await import("./admin-support-inbox-count");

const VISIT = "2026-11-12T09:30:00.000Z";

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function Count() {
  const { count } = useAdminSupportInbox();
  return <span data-testid="count">{count === null ? "none" : count}</span>;
}

function mount(initialCount: number | null, { strict = false }: { strict?: boolean } = {}) {
  const tree = (
    <AdminSupportInboxProvider initialCount={initialCount}>
      <Count />
      <AdminSupportInboxSeen visitStartedAt={VISIT} />
    </AdminSupportInboxProvider>
  );
  return act(async () => {
    root.render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  });
}

const shownCount = () => container.querySelector('[data-testid="count"]')!.textContent;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  global.fetch = fetchMock as unknown as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AdminSupportInboxSeen", () => {
  it("POSTs once after mount, handing back the page's render time, and clears the badge count on success", async () => {
    await mount(4);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/support/inbox/seen");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ seenAt: VISIT });
    expect(shownCount()).toBe("0");
  });

  it("does not post twice when React runs the effect twice (strict mode)", async () => {
    await mount(4, { strict: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("leaves the badge as it was, silently, when the server refuses", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);

    await mount(4);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(shownCount()).toBe("4");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("leaves the badge as it was, silently, when the request cannot be made at all", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await mount(4);

    expect(shownCount()).toBe("4");
  });

  it("does nothing until it is mounted: merely rendering the provider makes no request", async () => {
    await act(async () => {
      root.render(
        <AdminSupportInboxProvider initialCount={4}>
          <Count />
        </AdminSupportInboxProvider>,
      );
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(shownCount()).toBe("4");
  });
});

describe("AdminSupportInboxProvider", () => {
  it("adopts a fresh server count after the client cleared its own", async () => {
    await mount(4);
    expect(shownCount()).toBe("0");

    await act(async () => {
      root.render(
        <AdminSupportInboxProvider initialCount={7}>
          <Count />
        </AdminSupportInboxProvider>,
      );
    });

    expect(shownCount()).toBe("7");
  });

  it("has no count for a non-admin (null), and clearing it leaves it that way", async () => {
    await mount(null);

    expect(shownCount()).toBe("none");
  });
});
