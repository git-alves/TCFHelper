// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, requestNavigationMock, navigationState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  requestNavigationMock: vi.fn(() => false),
  navigationState: { busy: false, workspaceMounted: false, pathname: "/dashboard" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ push: pushMock, prefetch: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => {
  const UserButton = Object.assign(({ children }: { children?: React.ReactNode }) => <>{children}</>, {
    MenuItems: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Action: ({ label }: { label: string }) => <span>{label}</span>,
  });
  return {
    Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    UserButton,
    useAuth: () => ({ isSignedIn: true, isLoaded: true }),
  };
});

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return {
    useAppCopy: () => getAppCopy("en"),
    useAppLocale: () => ({ locale: "en", setLocale: vi.fn() }),
  };
});

vi.mock("@/components/dashboard-nav-guard", () => ({
  useDashboardNavGuard: () => ({
    requestNavigation: requestNavigationMock,
    isNavigationBusy: navigationState.busy,
    isWorkspaceMounted: navigationState.workspaceMounted,
  }),
}));

vi.mock("@/components/walkthrough-trigger", () => ({
  useWalkthroughTrigger: () => ({ requestStart: () => {}, isAvailable: false }),
}));

const { NavBar, formatBellCount } = await import("./nav-bar");
const { AdminSupportInboxProvider, AdminSupportInboxSeen } = await import("./admin-support-inbox-count");

let container: HTMLDivElement;
let root: Root;

function render(props: { isAdmin?: boolean; count?: number | null }) {
  act(() => {
    root.render(
      <AdminSupportInboxProvider initialCount={props.count ?? null}>
        <NavBar isAdmin={props.isAdmin} />
      </AdminSupportInboxProvider>,
    );
  });
}

const bell = () => container.querySelector('[data-testid="admin-support-bell"]') as HTMLAnchorElement | null;
const badge = () => container.querySelector('[data-testid="admin-support-bell-badge"]');

beforeEach(() => {
  pushMock.mockClear();
  requestNavigationMock.mockReset();
  requestNavigationMock.mockReturnValue(false);
  navigationState.busy = false;
  navigationState.workspaceMounted = false;
  navigationState.pathname = "/dashboard";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("NavBar admin support bell", () => {
  it("is never rendered for a non-admin, even if a count were somehow supplied", () => {
    render({ isAdmin: false, count: 4 });

    expect(bell()).toBeNull();
    expect(badge()).toBeNull();
    expect(container.querySelector('a[href="/admin/support"]')).toBeNull();
  });

  it("renders the bell itself, a flex child right before the Support icon, when there are new tickets", () => {
    render({ isAdmin: true, count: 2 });

    const support = container.querySelector('a[href="/support"]')!;
    expect(bell()).not.toBeNull();
    expect(bell()!.getAttribute("href")).toBe("/admin/support");
    // Directly before Support, with no wrapper or placeholder in between.
    expect(bell()!.nextElementSibling).toBe(support);
    expect(bell()!.parentElement).toBe(support.parentElement);
    // The Admin entry in the account menu is a separate, existing control.
    expect(bell()!.closest('[data-walkthrough="nav-settings"]')).toBeNull();
  });

  it("is a 44px target with a 20px glyph, the icon-button look and a visible keyboard focus ring", () => {
    render({ isAdmin: true, count: 2 });

    const classes = bell()!.className;
    expect(classes).toContain("h-11");
    expect(classes).toContain("w-11");
    expect(classes).toContain("rounded-full");
    expect(classes).toContain("text-zinc-600");
    expect(classes).toContain("hover:bg-black/[.04]");
    expect(classes).toContain("focus-visible:ring-2");
    expect(classes).toContain("focus-visible:ring-violet-500");
    expect(classes).toContain("focus-visible:ring-offset-2");
    expect(bell()!.querySelector("svg")!.getAttribute("class")).toContain("h-5 w-5");
  });

  it("shows no bell at all when there are no new tickets", () => {
    render({ isAdmin: true, count: 0 });

    expect(bell()).toBeNull();
    expect(badge()).toBeNull();
    expect(container.querySelector('a[href="/admin/support"]')).toBeNull();
    expect(container.querySelector('button[aria-label^="Support inbox"]')).toBeNull();
  });

  it("shows no bell, and no error, when the count is unknown (the lookup failed)", () => {
    render({ isAdmin: true, count: null });

    expect(bell()).toBeNull();
    expect(container.querySelector('a[href="/admin/support"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("leaves no bell node, slot or empty space at 0 or unknown, so Support sits where it always does", () => {
    for (const count of [0, null]) {
      render({ isAdmin: true, count });

      expect(container.querySelector('[data-testid="admin-support-bell"]')).toBeNull();
      expect(container.querySelector('[data-testid="admin-support-bell-slot"]')).toBeNull();
      expect(container.querySelector('a[href="/admin/support"]')).toBeNull();
      // Nothing sits between the Support icon and the node before it except the normal gap.
      const support = container.querySelector('a[href="/support"]')!;
      expect(support.previousElementSibling?.getAttribute("data-testid") ?? null).toBeNull();
      expect(support.previousElementSibling?.className ?? "").not.toContain("w-9");
    }
  });

  it("reserves nothing for a non-admin either", () => {
    render({ isAdmin: false, count: 3 });

    expect(container.querySelector('[data-testid="admin-support-bell-slot"]')).toBeNull();
    expect(bell()).toBeNull();
  });

  it("puts the right-hand group on shrink-0 so Bell, Support and the account button wrap together", () => {
    render({ isAdmin: true, count: 2 });

    const group = bell()!.parentElement!;
    expect(group.className).toContain("shrink-0");
    expect(group.className).toContain("gap-2");
    expect(group.className).toContain("sm:gap-3");
  });

  it("shows the count in a badge and in the accessible label", () => {
    render({ isAdmin: true, count: 3 });

    expect(badge()!.textContent).toBe("3");
    expect(badge()!.getAttribute("aria-hidden")).toBe("true");
    // Inside the 44px target, readable on both themes.
    for (const klass of ["right-1", "top-1", "h-4", "min-w-4", "px-1", "text-[10px]", "ring-2", "ring-background"]) {
      expect(badge()!.className).toContain(klass);
    }
    expect(bell()!.getAttribute("aria-label")).toBe("Support inbox — 3 new tickets");
    expect(bell()!.getAttribute("title")).toBe("Support inbox — 3 new tickets");
  });

  it("uses the singular for one ticket", () => {
    render({ isAdmin: true, count: 1 });

    expect(bell()!.getAttribute("aria-label")).toBe("Support inbox — 1 new ticket");
  });

  it("caps the badge at 9+ but keeps the real number in the label", () => {
    render({ isAdmin: true, count: 10 });

    expect(badge()!.textContent).toBe("9+");
    expect(bell()!.getAttribute("aria-label")).toBe("Support inbox — 10 new tickets");

    render({ isAdmin: true, count: 9 });
    expect(badge()!.textContent).toBe("9");
    expect(formatBellCount(9)).toBe("9");
    expect(formatBellCount(10)).toBe("9+");
    expect(formatBellCount(250)).toBe("9+");
  });

  it("goes through the unsaved-draft guard: a normal click asks it, and navigates when it lets go", () => {
    render({ isAdmin: true, count: 2 });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    act(() => {
      bell()!.dispatchEvent(event);
    });

    expect(requestNavigationMock).toHaveBeenCalledWith("/admin/support");
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not navigate when the guard takes over to confirm discarding a draft", () => {
    requestNavigationMock.mockReturnValue(true);
    render({ isAdmin: true, count: 2 });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    act(() => {
      bell()!.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves modified clicks (open in a new tab) to the browser", () => {
    render({ isAdmin: true, count: 2 });

    act(() => {
      bell()!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true }));
    });

    expect(requestNavigationMock).not.toHaveBeenCalled();
  });

  it("is disabled with the reason while the writing workspace cannot be left (a correction is running)", () => {
    navigationState.workspaceMounted = true;
    navigationState.busy = true;
    render({ isAdmin: true, count: 2 });

    expect(bell()).toBeNull();
    const disabled = container.querySelector('button[aria-label^="Support inbox"]') as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);
    expect(disabled.getAttribute("aria-label")).toContain("Support inbox — 2 new tickets — ");
  });

  it("the bell disappears once the inbox visit is recorded, without a reload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    render({ isAdmin: true, count: 5 });
    expect(badge()!.textContent).toBe("5");

    await act(async () => {
      root.render(
        <AdminSupportInboxProvider initialCount={5}>
          <NavBar isAdmin />
          <AdminSupportInboxSeen visitStartedAt="2026-11-12T09:30:00.000Z" />
        </AdminSupportInboxProvider>,
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bell()).toBeNull();
    expect(badge()).toBeNull();
    expect(container.querySelector('[data-testid="admin-support-bell-slot"]')).toBeNull();
  });

  it("the bell stays when the visit could not be recorded", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response) as unknown as typeof fetch;

    await act(async () => {
      root.render(
        <AdminSupportInboxProvider initialCount={5}>
          <NavBar isAdmin />
          <AdminSupportInboxSeen visitStartedAt="2026-11-12T09:30:00.000Z" />
        </AdminSupportInboxProvider>,
      );
    });

    expect(bell()).not.toBeNull();
    expect(badge()!.textContent).toBe("5");
  });
});

describe("admin bell copy", () => {
  it.each([
    ["fr", 0, "Boîte de réception du support"],
    ["fr", 1, "Boîte de réception du support — 1 nouveau ticket"],
    ["fr", 4, "Boîte de réception du support — 4 nouveaux tickets"],
    ["es", 1, "Bandeja de soporte — 1 ticket nuevo"],
    ["es", 4, "Bandeja de soporte — 4 tickets nuevos"],
    ["pt", 1, "Caixa de suporte — 1 chamado novo"],
    ["pt", 4, "Caixa de suporte — 4 chamados novos"],
  ] as const)("is translated for %s (%i)", async (locale, count, expected) => {
    const { getAppCopy } = await import("@/lib/app-copy");
    expect(getAppCopy(locale).nav.adminSupportInbox({ count })).toBe(expected);
  });
});
