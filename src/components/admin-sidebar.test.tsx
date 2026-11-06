import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));

const { AdminSidebar } = await import("./admin-sidebar");
const { AdminPromptsNavGuardProvider } = await import("./admin-prompts-nav-guard");

function render(pathname: string) {
  usePathnameMock.mockReturnValue(pathname);
  return renderToStaticMarkup(
    <AdminPromptsNavGuardProvider>
      <AdminSidebar />
    </AdminPromptsNavGuardProvider>,
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
