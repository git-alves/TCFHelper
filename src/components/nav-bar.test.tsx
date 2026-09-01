import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/practice",
  useRouter: () => ({ push: () => {} }),
}));

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
}));

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return { useAppCopy: () => getAppCopy("en") };
});

vi.mock("@/components/dashboard-nav-guard", () => ({
  useDashboardNavGuard: () => ({
    requestNavigation: () => false,
    isNavigationBusy: false,
    isWorkspaceMounted: false,
  }),
}));

vi.mock("@/components/walkthrough-trigger", () => ({
  useWalkthroughTrigger: () => ({ requestStart: () => {}, isAvailable: false }),
}));

const { NavBar } = await import("./nav-bar");

describe("NavBar", () => {
  it("keeps the three learning destinations visible in a stable order", () => {
    const markup = renderToStaticMarkup(<NavBar />);

    const dashboard = markup.indexOf('href="/dashboard"');
    const practice = markup.indexOf('href="/practice"');
    const tasks = markup.indexOf('href="/tasks"');

    expect(dashboard).toBeGreaterThanOrEqual(0);
    expect(practice).toBeGreaterThan(dashboard);
    expect(tasks).toBeGreaterThan(practice);
    expect(markup.match(/href="\/dashboard"/g)).toHaveLength(1);
    expect(markup).toContain('aria-current="page"');
  });
});
