// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { pushMock, prefetchMock, requestNavigationMock, pathnameMock, setLocaleMock, useAuthMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  prefetchMock: vi.fn(),
  requestNavigationMock: vi.fn(() => false),
  pathnameMock: vi.fn(() => "/practice"),
  setLocaleMock: vi.fn(),
  useAuthMock: vi.fn(
    (): { isSignedIn: boolean | undefined; isLoaded: boolean } => ({ isSignedIn: true, isLoaded: true }),
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
  useRouter: () => ({ push: pushMock, prefetch: prefetchMock }),
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
    useAuth: useAuthMock,
  };
});

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return {
    useAppCopy: () => getAppCopy("en"),
    useAppLocale: () => ({ locale: "en", setLocale: setLocaleMock }),
  };
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
    pathnameMock.mockReturnValue("/practice");
    setLocaleMock.mockClear();
    useAuthMock.mockReturnValue({ isSignedIn: true, isLoaded: true });
  });

  it("keeps the three learning destinations visible in a stable order", () => {
    const markup = renderToStaticMarkup(<NavBar />);

    const dashboard = markup.indexOf('href="/dashboard"');
    const practice = markup.indexOf('href="/practice"');
    const tasks = markup.indexOf('href="/tasks"');

    expect(dashboard).toBeGreaterThanOrEqual(0);
    expect(practice).toBeGreaterThan(dashboard);
    expect(tasks).toBeGreaterThan(practice);
    // The logo also links to /dashboard while signed in, alongside the nav item.
    expect(markup.match(/href="\/dashboard"/g)).toHaveLength(2);
    expect(markup).toContain('aria-current="page"');
  });

  it("sends the logo to the dashboard once signed in", () => {
    const markup = renderToStaticMarkup(<NavBar />);

    expect(markup).toMatch(/<a class="[^"]*" href="\/dashboard">[\s\S]*?>TCF</);
  });

  it("sends the logo to the landing page while signed out", () => {
    useAuthMock.mockReturnValue({ isSignedIn: false, isLoaded: true });

    const markup = renderToStaticMarkup(<NavBar />);

    expect(markup).toMatch(/<a class="[^"]*" href="\/">[\s\S]*?>TCF</);
  });

  it("blocks the logo's click while Clerk auth is still resolving, instead of guarding toward a guessed destination", () => {
    // logoHref falls back to "/" until isLoaded is true, since isSignedIn is
    // still undefined -- guarding toward it here would risk sending an
    // actually-signed-in learner who confirms the dialog to the landing
    // page instead of the dashboard. Blocking the click is the safe
    // fallback: the same click, retried once auth settles, lands correctly.
    useAuthMock.mockReturnValue({ isSignedIn: undefined, isLoaded: false });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<NavBar />);
    });

    const logo = container.querySelector<HTMLAnchorElement>('a[href="/"]');
    expect(logo).not.toBeNull();
    let event!: MouseEvent;
    act(() => {
      event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      logo!.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(requestNavigationMock).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("guards the logo toward the dashboard, not the landing page, once a signed-in session resolves", () => {
    // Regression test for the destination a confirmed guard click carries
    // the learner to: it must be /dashboard once Clerk has resolved
    // isSignedIn, not the "/" logoHref falls back to while unresolved.
    useAuthMock.mockReturnValue({ isSignedIn: true, isLoaded: true });
    requestNavigationMock.mockReturnValue(true);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<NavBar />);
    });

    // The Dashboard nav link also has href="/dashboard" -- the "font-semibold"
    // class is unique to the logo, unlike the nav link's own classes.
    const logo = container.querySelector<HTMLAnchorElement>('a.font-semibold[href="/dashboard"]');
    expect(logo).not.toBeNull();
    act(() => {
      logo!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(requestNavigationMock).toHaveBeenCalledWith("/dashboard");

    act(() => {
      root.unmount();
    });
    container.remove();
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

  it("offers the persisted language picker on the public landing page, with a flag per language", () => {
    pathnameMock.mockReturnValue("/");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<NavBar />);
    });

    const trigger = container.querySelector<HTMLButtonElement>("#landing-language");
    expect(trigger).not.toBeNull();
    expect(trigger!.getAttribute("aria-label")).toBe("Language");
    // Defaults to English until the learner picks something else.
    expect(trigger!.textContent).toContain("English");

    act(() => {
      trigger!.click();
    });

    const optionButtons = Array.from(container.querySelectorAll('[role="option"]'));
    expect(optionButtons.map((button) => button.textContent)).toEqual([
      "English",
      "Français",
      "Español",
      "Português",
    ]);
    // Each language option carries its own flag icon, not shared text-only labels.
    expect(container.querySelectorAll('[role="option"] svg')).toHaveLength(4);

    act(() => {
      root.unmount();
    });
    container.remove();
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
