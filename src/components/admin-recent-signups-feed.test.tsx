import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminRecentSignupsFeed } from "./admin-recent-signups-feed";

describe("AdminRecentSignupsFeed", () => {
  it("shows a name (falling back to email) and each signup's own local time", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminRecentSignupsFeed, {
        initialSignups: [
          {
            id: "user_1",
            email: "named@example.com",
            name: "Named Learner",
            createdAt: "2026-09-05T12:00:00.000Z",
            timezone: "America/Sao_Paulo",
          },
          {
            id: "user_2",
            email: "unnamed@example.com",
            name: null,
            createdAt: "2026-09-05T11:00:00.000Z",
            timezone: null,
          },
        ],
      }),
    );

    expect(markup).toContain("Named Learner");
    expect(markup).toContain("unnamed@example.com");
    // Sao Paulo is UTC-3: 12:00 UTC reads as 9:00 AM there.
    expect(markup).toContain("9:00");
    expect(markup).toContain("GMT-3");
    // Unknown timezone falls back to UTC, not the server's own zone.
    expect(markup).toContain("UTC");
  });

  it("shows an empty state before any learner has signed up", () => {
    const markup = renderToStaticMarkup(createElement(AdminRecentSignupsFeed, { initialSignups: [] }));

    expect(markup).toContain("No signups yet.");
  });

  it("does not claim staleness before any poll has run", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminRecentSignupsFeed, {
        initialSignups: [
          { id: "user_1", email: "learner@example.com", name: null, createdAt: "2026-09-05T12:00:00.000Z", timezone: null },
        ],
      }),
    );

    expect(markup).not.toContain("May be outdated");
  });
});
