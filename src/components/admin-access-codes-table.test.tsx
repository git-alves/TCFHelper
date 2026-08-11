import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { AdminAccessCodesTable } = await import("./admin-access-codes-table");

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
});
