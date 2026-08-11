import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { purgeExpiredAdminEventsMock } = vi.hoisted(() => ({ purgeExpiredAdminEventsMock: vi.fn() }));

vi.mock("@/lib/admin-events", () => ({ purgeExpiredAdminEvents: purgeExpiredAdminEventsMock }));

const { GET } = await import("./route");

function request(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/admin-events-retention", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  purgeExpiredAdminEventsMock.mockReset();
  purgeExpiredAdminEventsMock.mockResolvedValue({ count: 4 });
  vi.stubEnv("CRON_SECRET", "retention-test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/admin-events-retention", () => {
  it("rejects missing or incorrect cron credentials without deleting events", async () => {
    const missing = await GET(request());
    const incorrect = await GET(request("Bearer wrong"));

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(purgeExpiredAdminEventsMock).not.toHaveBeenCalled();
  });

  it("fails closed when the deployment has no cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(request("Bearer "));

    expect(response.status).toBe(401);
    expect(purgeExpiredAdminEventsMock).not.toHaveBeenCalled();
  });

  it("purges with the Vercel bearer credential and returns the deleted count", async () => {
    const response = await GET(request("Bearer retention-test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: 4 });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns a retryable failure without exposing the database error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    purgeExpiredAdminEventsMock.mockRejectedValue(new Error("postgres://secret@host"));

    const response = await GET(request("Bearer retention-test-secret"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Retention purge failed" });
    expect(errorSpy).toHaveBeenCalledWith("Admin-event retention purge failed");
  });
});
