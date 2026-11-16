import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAdminApiUser,
  getInactivityEmailDisplay,
  updateInactivityEmailSettings,
} = vi.hoisted(() => ({
  getAdminApiUser: vi.fn(),
  getInactivityEmailDisplay: vi.fn(),
  updateInactivityEmailSettings: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser,
  adminNotFoundResponse: () => new Response(null, { status: 404 }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status }),
}));
vi.mock("@/lib/inactivity-emails", () => ({
  getInactivityEmailDisplay,
  updateInactivityEmailSettings,
}));

const { PUT } = await import("./route");

beforeEach(() => {
  getAdminApiUser.mockReset();
  updateInactivityEmailSettings.mockReset();
  getAdminApiUser.mockResolvedValue({ id: "admin" });
  updateInactivityEmailSettings.mockResolvedValue({ enabled: false });
});

describe("PUT /api/admin/inactivity-emails", () => {
  it("hides the route from non-admins", async () => {
    getAdminApiUser.mockResolvedValue(null);
    expect(
      (
        await PUT(
          new Request("http://localhost", { method: "PUT", body: "{}" }),
        )
      ).status,
    ).toBe(404);
  });

  it("forwards valid settings and leaves provider eligibility to the service", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(response.status).toBe(200);
    expect(updateInactivityEmailSettings).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it("rejects malformed template values before saving", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({
          templates: [{ kind: "SEVEN_DAY", locale: "en", subject: "ok" }],
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(updateInactivityEmailSettings).not.toHaveBeenCalled();
  });

  it("returns validation and missing-provider errors from the settings service", async () => {
    updateInactivityEmailSettings.mockRejectedValueOnce(
      new Error("“{email}” isn’t available."),
    );
    const invalid = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({
          templates: [
            {
              kind: "SEVEN_DAY",
              locale: "en",
              subject: "Hi {email}",
              body: "Body",
            },
          ],
        }),
      }),
    );
    expect(invalid.status).toBe(400);
    updateInactivityEmailSettings.mockRejectedValueOnce(
      new Error(
        "Email sending is unavailable: RESEND_API_KEY is not configured.",
      ),
    );
    const unconfigured = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(unconfigured.status).toBe(400);
  });
});
