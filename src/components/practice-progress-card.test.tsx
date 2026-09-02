import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getAppCopy } from "@/lib/app-copy";
import { PracticeProgressCardContent } from "./practice-progress-card";

describe("PracticeProgressCardContent", () => {
  it("keeps curated-practice activity separate from CEFR corrections", () => {
    const markup = renderToStaticMarkup(
      <PracticeProgressCardContent
        copy={getAppCopy("en")}
        summary={{
          completedExercises: 18,
          completedIndependently: 14,
          completedWithHelp: 4,
          completedTaskParts: 3,
        }}
      />,
    );

    expect(markup).toContain("Practice activity");
    expect(markup).toContain("18 exercises completed");
    expect(markup).toContain("14 independently · 4 with help");
    expect(markup).toContain("3 task parts trained");
    expect(markup).toContain('href="/practice"');
    expect(markup).toContain("More options");
  });

  it("does not add another empty report to a brand-new Dashboard", () => {
    const markup = renderToStaticMarkup(
      <PracticeProgressCardContent
        copy={getAppCopy("en")}
        summary={{
          completedExercises: 0,
          completedIndependently: 0,
          completedWithHelp: 0,
          completedTaskParts: 0,
        }}
      />,
    );

    expect(markup).toBe("");
  });
});
