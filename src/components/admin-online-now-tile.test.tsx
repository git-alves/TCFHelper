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
});
