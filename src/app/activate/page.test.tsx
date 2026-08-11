import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const {
  getCurrentAppUserMock,
  AppUserProvisioningErrorMock,
  hasRedeemedAccessCodeMock,
  redirectForUnauthenticatedOrBlockedUserMock,
  redirectMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    hasRedeemedAccessCodeMock: vi.fn(),
    redirectForUnauthenticatedOrBlockedUserMock: vi.fn(),
    redirectMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/access-code", () => ({
  hasRedeemedAccessCode: hasRedeemedAccessCodeMock,
}));
vi.mock("@/lib/blocked-user-redirect", () => ({
  redirectForUnauthenticatedOrBlockedUser: redirectForUnauthenticatedOrBlockedUserMock,
}));
vi.mock("@/components/access-code-activation-form", () => ({
  AccessCodeActivationForm: () => <div data-testid="access-code-activation-form" />,
}));
vi.mock("@/components/dashboard-account-unavailable", () => ({
  DashboardAccountUnavailable: () => <div data-testid="dashboard-account-unavailable" />,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { default: ActivatePage } = await import("./page");

const USER = { id: "cuid_learner_1", isAdmin: false };

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  hasRedeemedAccessCodeMock.mockReset();
  redirectForUnauthenticatedOrBlockedUserMock.mockReset();
  redirectMock.mockReset();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });

  getCurrentAppUserMock.mockResolvedValue(USER);
  hasRedeemedAccessCodeMock.mockResolvedValue(false);
});

describe("/activate", () => {
  it("redirects an already-activated learner instead of rendering the unavailable message", async () => {
    hasRedeemedAccessCodeMock.mockResolvedValue(true);

    await expect(ActivatePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/tasks");
  });

  it("redirects the owner on a direct visit without ever checking redemption", async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: "owner_1", isAdmin: true });

    await expect(ActivatePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/tasks");
    expect(hasRedeemedAccessCodeMock).not.toHaveBeenCalled();
  });

  it("renders the activation form for a learner who has not redeemed a code", async () => {
    const page = await ActivatePage();

    expect(renderToStaticMarkup(page)).toContain('data-testid="access-code-activation-form"');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("fails closed, without redirecting, when activation state cannot be read", async () => {
    hasRedeemedAccessCodeMock.mockRejectedValue(new Error("database unavailable"));

    const page = await ActivatePage();

    expect(renderToStaticMarkup(page)).toContain("Activation is temporarily unavailable");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("defers to the shared redirect for an unauthenticated or blocked visitor", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const page = await ActivatePage();

    expect(page).toBeNull();
    expect(redirectForUnauthenticatedOrBlockedUserMock).toHaveBeenCalledWith("/activate");
  });

  it("shows the account-unavailable screen when the Clerk identity cannot be provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity cannot be linked"));

    const page = await ActivatePage();

    expect(renderToStaticMarkup(page)).toContain('data-testid="dashboard-account-unavailable"');
  });
});
