import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAppUserMock, AppUserProvisioningErrorMock, dismissSupportNoticeMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  return { getCurrentAppUserMock: vi.fn(), AppUserProvisioningErrorMock, dismissSupportNoticeMock: vi.fn() };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/support-resolution", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/support-resolution")>()),
  dismissSupportNotice: dismissSupportNoticeMock,
}));

const { POST } = await import("./route");

const NEXT_NOTICE = { id: "req_2", ticketNumber: 9, resolutionNote: null, resolvedAt: "2026-11-11T09:00:00.000Z" };

function call(requestId = "req_1") {
  return POST(new Request(`http://localhost/api/support/${requestId}/dismiss`, { method: "POST" }), {
    params: Promise.resolve({ requestId }),
  });
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  dismissSupportNoticeMock.mockReset();
  getCurrentAppUserMock.mockResolvedValue({ id: "learner_1" });
  dismissSupportNoticeMock.mockResolvedValue({ kind: "ok", next: null });
});

describe("POST /api/support/[requestId]/dismiss", () => {
  it("rejects an unauthenticated caller before touching anything", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(dismissSupportNoticeMock).not.toHaveBeenCalled();
  });

  it("answers 503 while the account is still being provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("not ready"));

    const response = await call();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "ACCOUNT_PROVISIONING_UNAVAILABLE" });
    expect(dismissSupportNoticeMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a ticket that is not the caller's, scoped to the signed-in learner", async () => {
    dismissSupportNoticeMock.mockResolvedValue({ kind: "notFound" });

    const response = await call("someone_elses_ticket");

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(dismissSupportNoticeMock.mock.calls[0].slice(0, 2)).toEqual(["learner_1", "someone_elses_ticket"]);
  });

  it("answers 409 when the ticket has no pending notice (not resolved, or already answered or dismissed)", async () => {
    dismissSupportNoticeMock.mockResolvedValue({ kind: "notPending" });

    const response = await call();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SUPPORT_NOTICE_NOT_PENDING" });
  });

  it("dismisses the notice and returns the next pending one", async () => {
    dismissSupportNoticeMock.mockResolvedValue({ kind: "ok", next: NEXT_NOTICE });

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ ok: true, next: NEXT_NOTICE });
    expect(dismissSupportNoticeMock).toHaveBeenCalledWith("learner_1", "req_1");
  });

});
