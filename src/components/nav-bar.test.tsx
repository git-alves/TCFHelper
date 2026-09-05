import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { pushMock, requestNavigationMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  requestNavigationMock: vi.fn(() => false),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/practice",
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@clerk/nextjs", () => {
  const UserButton = Object.assign(
    ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    {
      MenuItems: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      // Static rendering can't dispatch a real click (this suite has no
      // DOM/jsdom environment), so this test double invokes onClick the
      // moment it renders -- the same outcome a click would produce --
      // letting assertions check the resulting navigation call.
      Action: ({ label, onClick }: { label: string; onClick?: () => void }) => {
        onClick?.();
        return <span>{label}</span>;
      },
    },
  );

  return {
    Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    UserButton,
  };
});

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return { useAppCopy: () => getAppCopy("en") };
});

vi.mock("@/components/dashboard-nav-guard", () => ({
  useDashboardNavGuard: () => ({
    requestNavigation: requestNavigationMock,
    isNavigationBusy: false,
    isWorkspaceMounted: false,
  }),
}));

vi.mock("@/components/walkthrough-trigger", () => ({
  useWalkthroughTrigger: () => ({ requestStart: () => {}, isAvailable: false }),
}));

const { NavBar } = await import("./nav-bar");

describe("NavBar", () => {
  beforeEach(() => {
    pushMock.mockClear();
    requestNavigationMock.mockClear();
    requestNavigationMock.mockReturnValue(false);
  });

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

  it("offers an accessibly labelled Support icon in the signed-in navigation only", () => {
    const markup = renderToStaticMarkup(<NavBar />);

    expect(markup.match(/href="\/support"/g)).toHaveLength(1);
    expect(markup.match(/aria-label="Support"/g)).toHaveLength(1);
    expect(markup.match(/title="Support"/g)).toHaveLength(1);
    expect(markup).not.toContain(">Support<");
  });

  it("keeps the three learning links as plain text, not bordered pills", () => {
    const markup = renderToStaticMarkup(<NavBar />);

    expect(markup).not.toContain("rounded-full border");
  });

  it("moves Settings into the account menu instead of a standalone icon", () => {
    const markup = renderToStaticMarkup(<NavBar />);

    expect(markup).toContain(">Settings<");
    expect(markup).toContain('data-walkthrough="nav-settings"');
    // Not a real href: a plain Clerk Link would hard-navigate past the
    // /settings intercepted-route modal instead of opening it.
    expect(markup).not.toContain('href="/settings"');
  });

  it("navigates to Settings through the router so the intercepted modal still opens", () => {
    renderToStaticMarkup(<NavBar />);

    expect(pushMock).toHaveBeenCalledWith("/settings");
  });

  it("shows Admin in the account menu for an admin, and hides it otherwise", () => {
    const adminMarkup = renderToStaticMarkup(<NavBar isAdmin />);
    expect(adminMarkup).toContain(">Admin<");

    const learnerMarkup = renderToStaticMarkup(<NavBar />);
    expect(learnerMarkup).not.toContain(">Admin<");
  });

  it("navigates to Admin when there is no unsaved draft to guard", () => {
    requestNavigationMock.mockReturnValue(false);

    renderToStaticMarkup(<NavBar isAdmin />);

    expect(requestNavigationMock).toHaveBeenCalledWith("/admin");
    expect(pushMock).toHaveBeenCalledWith("/admin");
  });

  it("guards Admin navigation against an unsaved draft instead of pushing straight through", () => {
    requestNavigationMock.mockReturnValue(true);

    renderToStaticMarkup(<NavBar isAdmin />);

    expect(requestNavigationMock).toHaveBeenCalledWith("/admin");
    expect(pushMock).not.toHaveBeenCalledWith("/admin");
  });
});
