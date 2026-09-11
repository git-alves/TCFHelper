import { beforeEach, describe, expect, it, vi } from "vitest";
import { LANDING_PAGE_COPY } from "@/lib/landing-page-copy";

const { authMock, isCurrentRequestBlockedMock, redirectMock, getRequestLocaleMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isCurrentRequestBlockedMock: vi.fn(),
  redirectMock: vi.fn(),
  getRequestLocaleMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/blocked-user", () => ({ isCurrentRequestBlocked: isCurrentRequestBlockedMock }));
vi.mock("@/lib/request-locale", () => ({ getRequestLocale: getRequestLocaleMock }));
vi.mock("@/components/home-hero", () => ({ HomeHero: () => null }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { default: Home, generateMetadata } = await import("./page");

beforeEach(() => {
  authMock.mockReset();
  isCurrentRequestBlockedMock.mockReset();
  redirectMock.mockReset();
  authMock.mockResolvedValue({ userId: "user_1" });
  isCurrentRequestBlockedMock.mockResolvedValue(false);
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  getRequestLocaleMock.mockReset();
  getRequestLocaleMock.mockResolvedValue("en");
});

describe("/", () => {
  it("routes a verified blocked session to the recovery modal", async () => {
    isCurrentRequestBlockedMock.mockResolvedValue(true);

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/blocked");
  });

  it("does not make a public-page outage look like a blocked account", async () => {
    isCurrentRequestBlockedMock.mockRejectedValue(new Error("database unavailable"));

    await expect(Home()).resolves.not.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("/ metadata", () => {
  it("uses the same landing-page copy the page renders, not a separate translation table", async () => {
    getRequestLocaleMock.mockResolvedValue("fr");

    const metadata = await generateMetadata();

    const frCopy = LANDING_PAGE_COPY.fr;
    expect(metadata.title).toContain(frCopy.title);
    expect(metadata.description).toBe(frCopy.description);
    expect(metadata.openGraph?.description).toBe(frCopy.description);
    expect(metadata.twitter?.description).toBe(frCopy.description);
  });

  it("declares a canonical URL and Open Graph locale", async () => {
    getRequestLocaleMock.mockResolvedValue("en");

    const metadata = await generateMetadata();

    expect(metadata.alternates?.canonical).toBeTruthy();
    expect(metadata.openGraph?.locale).toBe("en_US");
  });
});
