import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentAppUserMock,
  redirectForUnauthenticatedOrBlockedUserMock,
  supportFormMock,
  AppUserProvisioningErrorMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    redirectForUnauthenticatedOrBlockedUserMock: vi.fn(),
    supportFormMock: vi.fn(() => null),
    AppUserProvisioningErrorMock,
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/blocked-user-redirect", () => ({
  redirectForUnauthenticatedOrBlockedUser: redirectForUnauthenticatedOrBlockedUserMock,
}));
vi.mock("@/components/support-form", () => ({ SupportForm: supportFormMock }));
vi.mock("@/components/account-unavailable-message", () => ({ AccountUnavailableMessage: () => null }));

const { SupportPageContent } = await import("./support-page-content");

describe("SupportPageContent", () => {
  beforeEach(() => {
    getCurrentAppUserMock.mockReset();
    redirectForUnauthenticatedOrBlockedUserMock.mockReset();
    supportFormMock.mockClear();
  });

  it("hands anonymous visitors to login through the /support callback instead of rendering an unowned form", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    await expect(SupportPageContent()).resolves.toBeNull();

    expect(redirectForUnauthenticatedOrBlockedUserMock).toHaveBeenCalledWith("/support");
    expect(supportFormMock).not.toHaveBeenCalled();
  });

  it("renders the support form only with the server-resolved sender identity", async () => {
    getCurrentAppUserMock.mockResolvedValue({ email: "learner@example.com", name: "Ada Learner" });

    const content = await SupportPageContent();
    renderToStaticMarkup(content);

    expect(supportFormMock).toHaveBeenCalledWith(
      { email: "learner@example.com", name: "Ada Learner" },
      undefined,
    );
    expect(redirectForUnauthenticatedOrBlockedUserMock).not.toHaveBeenCalled();
  });
});
