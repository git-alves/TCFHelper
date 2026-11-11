import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));
// Exposes the prefetch prop (which a real Link consumes) as a data attribute.
vi.mock("next/link", () => ({
  default: ({ prefetch, children, ...rest }: { prefetch?: boolean; children: React.ReactNode } & Record<string, unknown>) => (
    <a data-prefetch={prefetch === undefined ? "default" : String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

const { AdminSidebar } = await import("./admin-sidebar");
const { AdminPromptsNavGuardProvider } = await import("./admin-prompts-nav-guard");
const { AdminSupportInboxProvider } = await import("./admin-support-inbox-count");

function render(pathname: string, newSupportTickets: number | null = null) {
  usePathnameMock.mockReturnValue(pathname);
  return renderToStaticMarkup(
    <AdminSupportInboxProvider initialCount={newSupportTickets}>
      <AdminPromptsNavGuardProvider>
        <AdminSidebar />
      </AdminPromptsNavGuardProvider>
    </AdminSupportInboxProvider>,
  );
}

function currentLinks(html: string) {
  return [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
}

beforeEach(() => usePathnameMock.mockReset());

describe("AdminSidebar", () => {
  it("links to every admin section", () => {
    const html = render("/admin");
    for (const href of ["/admin", "/admin/users", "/admin/access-codes", "/admin/support", "/admin/logs", "/admin/api-keys", "/admin/prompts"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("marks only Overview current on the bare /admin route", () => {
    expect(currentLinks(render("/admin"))).toEqual(["Overview"]);
  });

  it("keeps a section current on its sub-routes", () => {
    expect(currentLinks(render("/admin/users/user_1"))).toEqual(["Users"]);
    expect(currentLinks(render("/admin/prompts"))).toEqual(["Prompts"]);
  });
});

describe("AdminSidebar support badge", () => {
  const supportLink = (html: string) => html.match(/<a [^>]*href="\/admin\/support"[^>]*>.*?<\/a>/)![0];

  it("shows the new-ticket count on the Support item only, with an accessible reading", () => {
    const html = render("/admin", 3);

    expect(supportLink(html)).toContain('data-testid="admin-sidebar-support-badge"');
    expect(supportLink(html)).toContain(">3<");
    expect(supportLink(html)).toContain(", 3 new");
    expect(html.match(/admin-sidebar-support-badge/g)).toHaveLength(1);
  });

  it("caps the badge at 9+", () => {
    expect(supportLink(render("/admin", 12))).toContain(">9+<");
  });

  it.each([0, null])("shows no badge when the count is %s", (count) => {
    expect(render("/admin", count)).not.toContain("admin-sidebar-support-badge");
  });

  it("keeps the Support item's link text when current, badge or not", () => {
    expect(currentLinks(render("/admin/support", 0))).toEqual(["Support requests"]);
  });
});

describe("AdminSidebar prefetching", () => {
  const prefetchOf = (html: string, href: string) =>
    html.match(new RegExp(`<a data-prefetch="([^"]*)"[^>]*href="${href.replaceAll("/", "\\/")}"`))?.[1];

  it("never prefetches the support inbox, so nothing can render it speculatively", () => {
    expect(prefetchOf(render("/admin"), "/admin/support")).toBe("false");
  });

  it("leaves every other section on the default prefetching", () => {
    const html = render("/admin");
    for (const href of ["/admin", "/admin/users", "/admin/access-codes", "/admin/logs", "/admin/api-keys", "/admin/prompts"]) {
      expect(prefetchOf(html, href)).toBe("default");
    }
  });
});

