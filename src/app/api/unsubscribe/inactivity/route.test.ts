import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const unsubscribe = vi.fn();
vi.mock("@/lib/inactivity-emails", () => ({
  unsubscribeFromInactivityEmails: unsubscribe,
}));
const { POST } = await import("./route");
beforeEach(() => unsubscribe.mockReset());
describe("POST /api/unsubscribe/inactivity", () => {
  it("processes a valid token", async () => {
    unsubscribe.mockResolvedValue({ kind: "unsubscribed" });
    expect(
      (
        await POST(
          new NextRequest(
            "http://localhost/api/unsubscribe/inactivity?token=valid",
          ),
        )
      ).status,
    ).toBe(204);
    expect(unsubscribe).toHaveBeenCalledWith("valid");
  });
  it("does not expose a tampered token or a repeated request", async () => {
    unsubscribe
      .mockResolvedValueOnce({ kind: "invalid" })
      .mockResolvedValueOnce({ kind: "already" });
    expect(
      (
        await POST(
          new NextRequest(
            "http://localhost/api/unsubscribe/inactivity?token=tampered",
          ),
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await POST(
          new NextRequest(
            "http://localhost/api/unsubscribe/inactivity?token=valid",
          ),
        )
      ).status,
    ).toBe(204);
  });
});
