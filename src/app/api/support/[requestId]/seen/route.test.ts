import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAppUserMock, AppUserProvisioningErrorMock, markSupportNoticeSeenMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  return { getCurrentAppUserMock: vi.fn(), AppUserProvisioningErrorMock, markSupportNoticeSeenMock: vi.fn() };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/support-resolution", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/support-resolution")>()),
  markSupportNoticeSeen: markSupportNoticeSeenMock,
}));

const { POST } = await import("./route");


function call(requestId = "req_1") {
  return POST(new Request(`http://localhost/api/support/${requestId}/seen`, { method: "POST" }), {
    params: Promise.resolve({ requestId }),
  });
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  markSupportNoticeSeenMock.mockReset();
  getCurrentAppUserMock.mockResolvedValue({ id: "learner_1" });
  markSupportNoticeSeenMock.mockResolvedValue({ kind: "ok", next: null });
});

describe("POST /api/support/[requestId]/seen", () => {
  it("rejects an unauthenticated caller before touching anything", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(markSupportNoticeSeenMock).not.toHaveBeenCalled();
  });

  it("answers 503 while the account is still being provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("not ready"));

    const response = await call();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "ACCOUNT_PROVISIONING_UNAVAILABLE" });
    expect(markSupportNoticeSeenMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a ticket that is not the caller's, scoped to the signed-in learner", async () => {
    markSupportNoticeSeenMock.mockResolvedValue({ kind: "notFound" });

    const response = await call("someone_elses_ticket");

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(markSupportNoticeSeenMock.mock.calls[0].slice(0, 2)).toEqual(["learner_1", "someone_elses_ticket"]);
  });

  it("answers 409 when the ticket has no pending notice (not resolved, or already answered or dismissed)", async () => {
    markSupportNoticeSeenMock.mockResolvedValue({ kind: "notPending" });

    const response = await call();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SUPPORT_NOTICE_NOT_PENDING" });
  });

  it("records the view without counting as learner activity", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, next: null });
    expect(markSupportNoticeSeenMock).toHaveBeenCalledWith("learner_1", "req_1");
    // Opening the notice follows a page load; it must not refresh "last active".
    expect(getCurrentAppUserMock).toHaveBeenCalledWith({ skipPresenceTouch: true });
  });

});
