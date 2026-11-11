// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/practice",
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
  useDashboardNavGuard: () => ({ requestNavigation: () => false, isNavigationBusy: false, isWorkspaceMounted: false }),
}));

vi.mock("@/components/walkthrough-trigger", () => ({
  useWalkthroughTrigger: () => ({ requestStart: () => {}, isAvailable: false }),
}));

const { NavBar } = await import("./nav-bar");

const NOTICE = { id: "req_7", ticketNumber: 7, resolutionNote: "We fixed the editor.", resolvedAt: "2026-11-12T10:00:00.000Z" };
const SECOND = { id: "req_9", ticketNumber: 9, resolutionNote: null, resolvedAt: "2026-11-13T10:00:00.000Z" };

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function render(supportNotice?: typeof NOTICE | null) {
  act(() => {
    root.render(<NavBar supportNotice={supportNotice} />);
  });
}

const supportLink = () => container.querySelector('a[href="/support"]') as HTMLAnchorElement;
const dot = () => container.querySelector('[data-testid="support-notice-dot"]');
const dialog = () => document.querySelector('[role="dialog"]');

function clickSupport() {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  act(() => {
    supportLink().dispatchEvent(event);
  });
  return event;
}

async function clickButton(label: string) {
  const target = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label || candidate.getAttribute("aria-label") === label,
  );
  if (!target) throw new Error(`No button "${label}"`);
  await act(async () => {
    target.click();
  });
}

const postsTo = (suffix: string) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith(suffix));

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(json({ ok: true, next: null }));
  global.fetch = fetchMock as unknown as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("NavBar support-resolution notice", () => {
  it("with nothing pending the icon is the plain Support link: no dot, no label change, a normal click", () => {
    render(null);

    expect(dot()).toBeNull();
    expect(supportLink().getAttribute("aria-label")).toBe("Support");
    expect(clickSupport().defaultPrevented).toBe(false);
    expect(dialog()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a red dot with an accessible label while a resolved ticket is waiting", () => {
    render(NOTICE);

    expect(dot()).not.toBeNull();
    expect(dot()!.className).toContain("bg-red-500");
    expect(dot()!.getAttribute("aria-hidden")).toBe("true");
    expect(supportLink().getAttribute("aria-label")).toBe("Support — Your support ticket was resolved — open to confirm");
    // Nothing is fetched just for showing the dot: it comes from the layout.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clicking the icon opens the notice instead of Support, and tells the server it was seen", () => {
    render(NOTICE);

    const event = clickSupport();

    expect(event.defaultPrevented).toBe(true);
    expect(dialog()!.textContent).toContain("Ticket #7 was resolved");
    expect(dialog()!.textContent).toContain("We fixed the editor.");
    expect(postsTo("/api/support/req_7/seen")).toHaveLength(1);
  });

  it('"It worked" records WORKED, closes the notice and removes the dot', async () => {
    render(NOTICE);
    clickSupport();

    await clickButton("It worked");

    const [url, init] = postsTo("/feedback")[0];
    expect(url).toBe("/api/support/req_7/feedback");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ feedback: "WORKED" });
    expect(dialog()).toBeNull();
    expect(dot()).toBeNull();
    expect(supportLink().getAttribute("aria-label")).toBe("Support");
    // Back to exactly today's behaviour.
    expect(clickSupport().defaultPrevented).toBe(false);
  });

  it('"I still have the problem" records STILL_BROKEN and removes the dot', async () => {
    render(NOTICE);
    clickSupport();

    await clickButton("I still have the problem");

    expect(JSON.parse((postsTo("/feedback")[0][1] as RequestInit).body as string)).toEqual({ feedback: "STILL_BROKEN" });
    expect(dialog()).toBeNull();
    expect(dot()).toBeNull();
  });

  it("the X dismisses with no feedback and the dot goes away for good", async () => {
    render(NOTICE);
    clickSupport();

    await clickButton("Close");

    expect(postsTo("/dismiss")).toHaveLength(1);
    expect(postsTo("/dismiss")[0][0]).toBe("/api/support/req_7/dismiss");
    expect(postsTo("/feedback")).toHaveLength(0);
    expect(dialog()).toBeNull();
    expect(dot()).toBeNull();
    expect(clickSupport().defaultPrevented).toBe(false);
  });

  it("with another ticket pending, shows one notice at a time: the dot stays and the next click opens the next one", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/seen") ? json({ ok: true, next: null }) : json({ ok: true, next: SECOND }),
    );
    render(NOTICE);
    clickSupport();
    expect(dialog()!.textContent).toContain("Ticket #7 was resolved");

    await clickButton("It worked");

    expect(dialog()).toBeNull();
    expect(dot()).not.toBeNull();
    expect(clickSupport().defaultPrevented).toBe(true);
    expect(dialog()!.textContent).toContain("Ticket #9 was resolved");
    expect(dialog()!.textContent).not.toContain("Ticket #7");
  });

  it("drops a notice the server says is no longer pending (answered or dismissed elsewhere)", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/seen") ? json({ ok: true, next: null }) : json({ code: "SUPPORT_NOTICE_NOT_PENDING" }, 409),
    );
    render(NOTICE);
    clickSupport();

    await clickButton("It worked");

    expect(dialog()).toBeNull();
    expect(dot()).toBeNull();
  });

  it("keeps the notice open, with an error, when saving fails, so the learner can retry", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/seen") ? json({ ok: true, next: null }) : json({ error: "boom" }, 500),
    );
    render(NOTICE);
    clickSupport();

    await clickButton("It worked");

    expect(dialog()).not.toBeNull();
    expect(dialog()!.querySelector('[role="alert"]')).not.toBeNull();
    expect(dot()).not.toBeNull();
  });

  it("a notice the learner answered does not come back when the layout renders again without it", async () => {
    render(NOTICE);
    clickSupport();
    await clickButton("It worked");

    render(null);

    expect(dot()).toBeNull();
  });
});
