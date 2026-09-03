import { describe, expect, it, vi } from "vitest";
import { requestSupportHubspotRetry } from "./admin-support-retry-button";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function neverRespondingFetch() {
  return vi.fn((_input: string | URL | Request, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  });
}

describe("requestSupportHubspotRetry", () => {
  it("reports a definite success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    const outcome = await requestSupportHubspotRetry("support_1", fetchImpl);

    expect(outcome).toEqual({ synced: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/admin/support/support_1/retry-hubspot",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces the server's error message on failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(502, { error: "HubSpot POST failed with 500" }));

    const outcome = await requestSupportHubspotRetry("support_1", fetchImpl);

    expect(outcome).toEqual({ synced: false, message: "HubSpot POST failed with 500" });
  });

  it("treats a client-side timeout as a failure without losing the abort signal", async () => {
    const fetchImpl = neverRespondingFetch();

    const outcome = await requestSupportHubspotRetry("support_1", fetchImpl, 5);

    expect(outcome.synced).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("too long") });
  });

  it("treats a network failure as a generic, retryable error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const outcome = await requestSupportHubspotRetry("support_1", fetchImpl);

    expect(outcome).toEqual({ synced: false, message: "Could not reach the admin service. Please try again." });
  });
});
