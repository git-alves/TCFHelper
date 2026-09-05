import { describe, expect, it, vi } from "vitest";
import { requestSupportRequestDeletion } from "./admin-support-delete-button";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

/**
 * Mirrors what a real, aborted fetch() does: the underlying promise rejects
 * with an AbortError once the signal fires, rather than simply hanging
 * forever or resolving on its own.
 */
function neverRespondingFetch() {
  return vi.fn((_input: string | URL | Request, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  });
}

describe("requestSupportRequestDeletion", () => {
  it("reports a definite success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await expect(requestSupportRequestDeletion("request_1", fetchImpl)).resolves.toEqual({ deleted: true });
  });

  it("treats a client-side timeout as an uncertain outcome that requires reconciliation, not a definite failure", async () => {
    const fetchImpl = neverRespondingFetch();

    const outcome = await requestSupportRequestDeletion("request_1", fetchImpl, 5, 5);

    expect(outcome.deleted).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("refreshed") });
  });

  it("waits out a grace period after a timeout before resolving, so the caller's eventual refresh has a real chance to observe a late-committing delete instead of racing it", async () => {
    const fetchImpl = neverRespondingFetch();

    const start = Date.now();
    const outcome = await requestSupportRequestDeletion("request_1", fetchImpl, 5, 50);
    const elapsed = Date.now() - start;

    expect(outcome.deleted).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  it("treats an already-removed request (404) as a state to reconcile, not a generic failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    const start = Date.now();
    const outcome = await requestSupportRequestDeletion("request_1", fetchImpl, 10_000, 5_000);
    const elapsed = Date.now() - start;

    expect(outcome.deleted).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("already removed") });
    expect(outcome).toMatchObject({ message: expect.stringContaining("refreshed") });
    // A response that actually arrived is already the server's final,
    // definite state -- no need to wait out the (deliberately huge, here)
    // grace period reserved for an ambiguous no-response outcome.
    expect(elapsed).toBeLessThan(1_000);
  });

  it("surfaces the server's message for a timed-out deletion (504)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(504, { error: "This deletion could not be confirmed in time. The request was not deleted — please try again." }),
    );

    const outcome = await requestSupportRequestDeletion("request_1", fetchImpl);

    expect(outcome).toEqual({
      deleted: false,
      message: "This deletion could not be confirmed in time. The request was not deleted — please try again.",
    });
  });

  it("treats a network failure as uncertain and worth reconciling", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const outcome = await requestSupportRequestDeletion("request_1", fetchImpl, 10_000, 5);

    expect(outcome.deleted).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("refreshed") });
  });
});
