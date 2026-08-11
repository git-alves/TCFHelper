import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { AdminUserActivationStatus } = await import("./admin-user-activation-status");

function render(props: Partial<Parameters<typeof AdminUserActivationStatus>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(AdminUserActivationStatus, {
      userId: "user_1",
      email: "learner@example.com",
      activationStamp: null,
      hasLiveAdmission: false,
      isCurrentAdmin: false,
      ...props,
    }),
  );
}

describe("AdminUserActivationStatus", () => {
  it("shows Awaiting new code when there is no attached admission at all", () => {
    const markup = render({ activationStamp: null, hasLiveAdmission: false });

    expect(markup).toContain("Awaiting new code");
    expect(markup).not.toContain("Deactivate access");
    expect(markup).not.toContain("Access expired");
  });

  it("offers Deactivate access with live-admission wording for a currently live admission", () => {
    const markup = render({ activationStamp: "2026-08-05T00:00:00.000Z", hasLiveAdmission: true });

    expect(markup).toContain("Deactivate access");
    expect(markup).toContain("Removes this learner");
    expect(markup).not.toContain("Access expired");
  });

  it("shows a distinct Access expired badge and expired wording for an attached but no-longer-live admission, while still offering Deactivate access", () => {
    // A timed code past its own expiry stays attached (redeemedByUserId
    // still set) until the learner's own next request lazily detaches it --
    // this must not be presented the same way as a currently live admission.
    const markup = render({ activationStamp: "2026-07-01T00:00:00.000Z", hasLiveAdmission: false });

    expect(markup).toContain("Access expired");
    expect(markup).toContain("Deactivate access");
    expect(markup).toContain("already expired but has not yet been automatically cleared");
    expect(markup).not.toContain("Removes this learner");
  });

  it("renders nothing for the current admin, regardless of admission state", () => {
    const markup = render({ isCurrentAdmin: true, activationStamp: "2026-08-05T00:00:00.000Z", hasLiveAdmission: true });

    expect(markup).toBe("");
  });
});
