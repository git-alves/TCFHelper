import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminOnlineNowTile } from "./admin-online-now-tile";

describe("AdminOnlineNowTile", () => {
  it("renders the server-provided initial count before any poll resolves", () => {
    const markup = renderToStaticMarkup(createElement(AdminOnlineNowTile, { initialCount: 7 }));

    expect(markup).toContain("Online now");
    expect(markup).toContain("7");
  });

  it("formats a large initial count with thousands separators", () => {
    const markup = renderToStaticMarkup(createElement(AdminOnlineNowTile, { initialCount: 1234 }));

    expect(markup).toContain("1,234");
  });

  it("exposes an atomic 'Online now: N' announcement, not just the bare number", () => {
    const markup = renderToStaticMarkup(createElement(AdminOnlineNowTile, { initialCount: 7 }));

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Online now:");
  });

  it("exposes the heartbeat window as descriptive context", () => {
    const markup = renderToStaticMarkup(createElement(AdminOnlineNowTile, { initialCount: 7 }));

    expect(markup).toContain("Active in the last 2 minutes.");
    expect(markup).toContain("aria-describedby");
  });

  it("shows the live pulsing dot, not the stale indicator, before any poll has run", () => {
    const markup = renderToStaticMarkup(createElement(AdminOnlineNowTile, { initialCount: 7 }));

    expect(markup).toContain("online-now-dot");
    expect(markup).not.toContain("Count may be outdated");
  });
});
