import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getAppCopy } from "@/lib/app-copy";
import { DashboardGettingStarted } from "./dashboard-getting-started";

describe("DashboardGettingStarted", () => {
  it("gives a new learner clear routes to focused practice and a full task", () => {
    const markup = renderToStaticMarkup(<DashboardGettingStarted copy={getAppCopy("en").dashboard} />);

    expect(markup).toContain('data-walkthrough="dashboard-start"');
    expect(markup).toContain('href="/practice"');
    expect(markup).toContain('href="/tasks"');
    expect(markup).toContain("Train a skill first");
    expect(markup).toContain("Simulate a task");
  });
});
