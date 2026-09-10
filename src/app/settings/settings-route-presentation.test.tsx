import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The route modules only decide which shell Settings uses. Stub the shared
// shell so this regression test stays focused on the direct-navigation
// fallback rather than duplicating the Modal component's own tests.
vi.mock("@/components/settings-modal", () => ({
  SettingsModal: ({ fallbackCloseHref }: { fallbackCloseHref?: string }) => (
    <div role="dialog" data-testid="settings-modal" data-fallback-close-href={fallbackCloseHref} />
  ),
}));

// Keep the direct-page assertion valid against the pre-fix implementation
// too: before the shared shell, /settings rendered this content inside a
// full-page <main>, which must not satisfy the modal contract by accident.
vi.mock("@/components/settings-page-content", () => ({
  SettingsPageContent: () => <div data-testid="settings-content" />,
}));

const { default: SettingsPage } = await import("./page");
const { default: InterceptedSettingsModal } = await import("../@settings/(.)settings/page");

describe("Settings route presentation", () => {
  it("keeps a direct /settings navigation in the compact modal shell", async () => {
    const markup = renderToStaticMarkup(await SettingsPage());

    expect(markup).toContain('role="dialog"');
    expect(markup).not.toContain("<main");
    expect(markup).toContain('data-fallback-close-href="/dashboard"');
  });

  it("uses the same shell for intercepted navigation", async () => {
    const markup = renderToStaticMarkup(await InterceptedSettingsModal());

    expect(markup).toContain('role="dialog"');
    expect(markup).not.toContain("data-fallback-close-href");
  });
});
