import { describe, expect, it, vi } from "vitest";
import { requestAccessCodeDeletion } from "./admin-access-code-delete-button";

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

describe("requestAccessCodeDeletion", () => {
  it("reports a definite success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await expect(requestAccessCodeDeletion("code_1", fetchImpl)).resolves.toEqual({ deleted: true });
  });

  it("treats a client-side timeout as an uncertain outcome that requires reconciliation, not a definite failure", async () => {
    // The server may have completed the deletion after the client gave up
    // waiting on it -- this is the exact race a prior version mishandled by
    // reporting a flat "please try again" without ever refreshing the list,
    // so a retry then hit a stale 404 while the row stayed visible.
    const fetchImpl = neverRespondingFetch();

    const outcome = await requestAccessCodeDeletion("code_1", fetchImpl, 5);

    expect(outcome.deleted).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("refreshed") });
  });

  it("treats an already-removed code (404) as a state to reconcile, not a generic failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    const outcome = await requestAccessCodeDeletion("code_1", fetchImpl);

    expect(outcome.deleted).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("already removed") });
    expect(outcome).toMatchObject({ message: expect.stringContaining("refreshed") });
  });

  it("surfaces the server's message for an actively-redeemed code (409)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(409, { error: "This code is currently granting a learner access. Deactivate their admission first." }),
    );

    const outcome = await requestAccessCodeDeletion("code_1", fetchImpl);

    expect(outcome).toEqual({
      deleted: false,
      message: "This code is currently granting a learner access. Deactivate their admission first.",
    });
  });

  it("treats a network failure as uncertain and worth reconciling", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const outcome = await requestAccessCodeDeletion("code_1", fetchImpl);

    expect(outcome.deleted).toBe(false);
    expect(outcome).toMatchObject({ message: expect.stringContaining("refreshed") });
  });
});
