import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { requestSupportResolution } = await import("./admin-support-resolve-button");

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("requestSupportResolution", () => {
  it("posts the trimmed note to the resolve route", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ resolved: true, ticketNumber: 3 }));

    await expect(requestSupportResolution("req_1", "  Try again.  ", fetchImpl)).resolves.toEqual({ resolved: true });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/admin/support/req_1/resolve");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ note: "Try again." });
  });

  it("sends no note at all for a blank one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ resolved: true }));

    await requestSupportResolution("req_1", "   ", fetchImpl);

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({});
  });

  it("surfaces the server's message, such as already resolved", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({ error: "This request is already resolved.", code: "SUPPORT_REQUEST_ALREADY_RESOLVED" }, 409));

    await expect(requestSupportResolution("req_1", "", fetchImpl)).resolves.toEqual({
      resolved: false,
      message: "This request is already resolved.",
    });
  });

  it("falls back to a generic message when the failure has no usable body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => Promise.reject(new Error("x")) } as unknown as Response);

    const outcome = await requestSupportResolution("req_1", "", fetchImpl);

    expect(outcome).toEqual({ resolved: false, message: "Could not mark this request resolved. Please try again." });
  });

  it("reports an unreachable service, and a timeout that may still have gone through", async () => {
    await expect(
      requestSupportResolution("req_1", "", vi.fn().mockRejectedValue(new Error("offline"))),
    ).resolves.toEqual({ resolved: false, message: "Could not reach the admin service. Please try again." });

    const abortingFetch = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    );
    const outcome = await requestSupportResolution("req_1", "", abortingFetch as unknown as typeof fetch, 10);
    expect(outcome.resolved).toBe(false);
    expect((outcome as { message: string }).message).toContain("took too long");
  });
});
