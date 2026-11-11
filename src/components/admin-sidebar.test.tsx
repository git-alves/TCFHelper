import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));

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

