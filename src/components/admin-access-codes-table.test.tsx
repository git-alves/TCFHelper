import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { AdminAccessCodesTable, requestAccessCodesBulkDeletion } = await import("./admin-access-codes-table");

describe("AdminAccessCodesTable", () => {
  it("describes a detached admission without implying that the learner was deleted", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAccessCodesTable, {
        accessCodes: [
          {
            id: "code_1",
            code: "TCF-AB12-CD34-EF56-GH78",
            note: null,
            createdAt: "2026-08-10T00:00:00.000Z",
            redeemedAt: "2026-08-11T00:00:00.000Z",
            redeemedByUserEmail: null,
            validityDays: null,
            expiresAt: null,
          },
        ],
      }),
    );

    expect(markup).toContain("Permanently spent on");
    expect(markup).toContain("no active admission");
    expect(markup).not.toContain("deleted account");
    // A detached admission has no live redeemer, so the code is safe to
    // delete without affecting anyone's access.
    expect(markup).toContain(">Delete<");
  });

  it("labels a lifetime code and an active timed code's expiry", () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const markup = renderToStaticMarkup(
      createElement(AdminAccessCodesTable, {
        accessCodes: [
          {
            id: "code_lifetime",
            code: "TCF-AAAA-AAAA-AAAA-AAAA",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: null,
            redeemedByUserEmail: null,
            validityDays: null,
            expiresAt: null,
          },
          {
            id: "code_timed",
            code: "TCF-BBBB-BBBB-BBBB-BBBB",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: "2026-08-05T00:00:00.000Z",
            redeemedByUserEmail: "learner@example.com",
            validityDays: 30,
            expiresAt: farFuture,
          },
        ],
      }),
    );

    expect(markup).toContain("Lifetime");
    expect(markup).toContain("30 days");
    expect(markup).toContain("Redeemed by learner@example.com");
    expect(markup).toContain("expires");
    // The unredeemed code is deletable; the actively redeemed one is not --
    // deleting it would sever that learner's live admission.
    expect(markup).toContain(">Delete<");
    expect(markup).toContain(">In use<");
  });

  it("flags a timed code past its expiry as pending removal rather than still active", () => {
    const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const markup = renderToStaticMarkup(
      createElement(AdminAccessCodesTable, {
        accessCodes: [
          {
            id: "code_expired",
            code: "TCF-CCCC-CCCC-CCCC-CCCC",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: "2026-08-02T00:00:00.000Z",
            redeemedByUserEmail: "learner@example.com",
            validityDays: 7,
            expiresAt: pastExpiry,
          },
        ],
      }),
    );

    expect(markup).toContain("expired");
    expect(markup).toContain("removed on their next visit");
    // Still attached in the database until the learner's next request lazily
    // detaches it -- deleting it now would sever access that has not
    // actually ended yet, so it must not offer Delete.
    expect(markup).not.toContain(">Delete<");
    expect(markup).toContain(">In use<");
  });

  it("offers a selection checkbox only for deletable codes", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAccessCodesTable, {
        accessCodes: [
          {
            id: "code_deletable",
            code: "TCF-AAAA-AAAA-AAAA-AAAA",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: null,
            redeemedByUserEmail: null,
            validityDays: null,
            expiresAt: null,
          },
          {
            id: "code_in_use",
            code: "TCF-BBBB-BBBB-BBBB-BBBB",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: "2026-08-05T00:00:00.000Z",
            redeemedByUserEmail: "learner@example.com",
            validityDays: null,
            expiresAt: null,
          },
        ],
      }),
    );

    expect(markup).toContain('aria-label="Select access code TCF-AAAA-AAAA-AAAA-AAAA"');
    expect(markup).not.toContain('aria-label="Select access code TCF-BBBB-BBBB-BBBB-BBBB"');
    expect(markup).toContain('aria-label="Select all deletable codes"');
  });

  it("does not offer a select-all control when nothing on the page is deletable", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAccessCodesTable, {
        accessCodes: [
          {
            id: "code_in_use",
            code: "TCF-BBBB-BBBB-BBBB-BBBB",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: "2026-08-05T00:00:00.000Z",
            redeemedByUserEmail: "learner@example.com",
            validityDays: null,
            expiresAt: null,
          },
        ],
      }),
    );

    expect(markup).not.toContain("Select all deletable codes");
  });
});

describe("requestAccessCodesBulkDeletion", () => {
  it("reports a definite success with the server's counts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ deletedCount: 2, requestedCount: 2 }), { status: 200 }));

    await expect(requestAccessCodesBulkDeletion(["code_1", "code_2"], fetchImpl)).resolves.toEqual({
      deletedCount: 2,
      requestedCount: 2,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/admin/access-codes/bulk-delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["code_1", "code_2"] }),
      }),
    );
  });

  it("treats a client-side timeout as uncertain, not a definite failure, mirroring the single-delete lesson", async () => {
    const fetchImpl = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const outcome = await requestAccessCodesBulkDeletion(["code_1"], fetchImpl, 5);

    expect(outcome).toMatchObject({ failed: true, message: expect.stringContaining("refreshed") });
  });

  it("surfaces the server's error message for a non-ok response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 }));

    const outcome = await requestAccessCodesBulkDeletion(["code_1"], fetchImpl);

    expect(outcome).toEqual({ failed: true, message: "Invalid request." });
  });
});
