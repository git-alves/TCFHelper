import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAppUserMock, AppUserProvisioningErrorMock, answerSupportNoticeMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  return { getCurrentAppUserMock: vi.fn(), AppUserProvisioningErrorMock, answerSupportNoticeMock: vi.fn() };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/support-resolution", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/support-resolution")>()),
  answerSupportNotice: answerSupportNoticeMock,
}));

const { POST } = await import("./route");

const NEXT_NOTICE = { id: "req_2", ticketNumber: 9, resolutionNote: null, resolvedAt: "2026-11-11T09:00:00.000Z" };

function call(requestId = "req_1", body: unknown = { feedback: "WORKED" }) {
  return POST(
    new Request(`http://localhost/api/support/${requestId}/feedback`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ requestId }) },
  );
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  answerSupportNoticeMock.mockReset();
  getCurrentAppUserMock.mockResolvedValue({ id: "learner_1" });
  answerSupportNoticeMock.mockResolvedValue({ kind: "ok", next: null });
});

describe("POST /api/support/[requestId]/feedback", () => {
  it("rejects an unauthenticated caller before touching anything", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(answerSupportNoticeMock).not.toHaveBeenCalled();
  });

  it("answers 503 while the account is still being provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("not ready"));

    const response = await call();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "ACCOUNT_PROVISIONING_UNAVAILABLE" });
    expect(answerSupportNoticeMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a ticket that is not the caller's, scoped to the signed-in learner", async () => {
    answerSupportNoticeMock.mockResolvedValue({ kind: "notFound" });

    const response = await call("someone_elses_ticket");

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(answerSupportNoticeMock.mock.calls[0].slice(0, 2)).toEqual(["learner_1", "someone_elses_ticket"]);
  });

  it("answers 409 when the ticket has no pending notice (not resolved, or already answered or dismissed)", async () => {
    answerSupportNoticeMock.mockResolvedValue({ kind: "notPending" });

    const response = await call();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SUPPORT_NOTICE_NOT_PENDING" });
  });

  it.each(["WORKED", "STILL_BROKEN"] as const)("records %s and returns the next pending notice", async (feedback) => {
    answerSupportNoticeMock.mockResolvedValue({ kind: "ok", next: NEXT_NOTICE });

    const response = await call("req_1", { feedback });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, next: NEXT_NOTICE });
    expect(answerSupportNoticeMock).toHaveBeenCalledWith("learner_1", "req_1", feedback);
  });

  it.each([
    ["an unknown value", { feedback: "MAYBE" }],
    ["a missing value", {}],
    ["an extra field", { feedback: "WORKED", status: "OPEN" }],
    ["a lowercase value", { feedback: "worked" }],
    ["invalid JSON", "not json"],
  ])("rejects %s with 400 before touching the ticket", async (_label, body) => {
    const response = await call("req_1", body);

    expect(response.status).toBe(400);
    expect(answerSupportNoticeMock).not.toHaveBeenCalled();
  });

});
