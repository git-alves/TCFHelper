import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAdminUserMock, getAppConfigDisplayMock, notFoundMock } = vi.hoisted(() => ({
  getCurrentAdminUserMock: vi.fn(),
  getAppConfigDisplayMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/admin-api-keys-form", () => ({ AdminApiKeysForm: () => <div data-testid="form" /> }));
vi.mock("@/lib/app-user", () => {
  class AppUserProvisioningError extends Error {}
  return { AppUserProvisioningError, getCurrentAdminUser: getCurrentAdminUserMock };
});
vi.mock("@/lib/app-config", () => ({ getAppConfigDisplay: getAppConfigDisplayMock }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

const { default: AdminApiKeysPage } = await import("./page");

beforeEach(() => {
  getCurrentAdminUserMock.mockReset();
  getAppConfigDisplayMock.mockReset();
  getCurrentAdminUserMock.mockResolvedValue({ id: "cuid_owner" });
  getAppConfigDisplayMock.mockResolvedValue({});
});

describe("/admin/api-keys", () => {
  it("is not found for anyone but the owner, and reads nothing", async () => {
    getCurrentAdminUserMock.mockResolvedValue(null);

    await expect(AdminApiKeysPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getAppConfigDisplayMock).not.toHaveBeenCalled();
  });

  it("no longer says the page only overrides the Gemini key", async () => {
    const markup = renderToStaticMarkup(await AdminApiKeysPage());

    expect(markup).not.toContain("Override the Gemini API key");
    expect(markup).toContain("Choose the AI provider, API key and model");
  });

  it("explains what a correction model must support, points to the Test button, and states the precedence and switch rules", async () => {
    const markup = renderToStaticMarkup(await AdminApiKeysPage());

    expect(markup).toContain("structured JSON output");
    expect(markup).toContain("at least 8,192 output tokens");
    expect(markup).toContain("plain text");
    expect(markup).toContain("<strong>Test</strong>");
    expect(markup).toContain("even before you save them");
    expect(markup).toContain("takes precedence");
    expect(markup).toContain("OPENROUTER_API_KEY");
    expect(markup).toContain("GEMINI_API_KEY");
    expect(markup).toContain("removes that section&#x27;s saved key and model");
    expect(markup).toContain('data-testid="form"');
  });
});
