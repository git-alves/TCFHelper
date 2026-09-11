import { describe, expect, it } from "vitest";
import { APP_LOCALES } from "@/lib/app-locale";
import { LANDING_PAGE_COPY } from "@/lib/landing-page-copy";

describe("landing page copy", () => {
  it("covers every supported landing-page language with the complete narrative", () => {
    for (const locale of APP_LOCALES) {
      const copy = LANDING_PAGE_COPY[locale];

      expect(copy.title).not.toHaveLength(0);
      expect(copy.demoTaskLabel).not.toHaveLength(0);
      expect(copy.demoTaskPrompt).not.toHaveLength(0);
      expect(copy.beforeText).not.toHaveLength(0);
      expect(copy.afterText).not.toHaveLength(0);
      // Before/after must pair up 1:1 so each row reads as a direct
      // comparison rather than two independent, differently-sized lists.
      expect(copy.beforeAnalysis).toHaveLength(3);
      expect(copy.afterAnalysis).toHaveLength(3);
      expect(copy.beforeAnalysis.map((item) => item.label)).toEqual(copy.afterAnalysis.map((item) => item.label));
      expect(copy.whyItems).toHaveLength(4);
      expect(copy.steps).toHaveLength(3);
      expect(copy.assessed).toHaveLength(4);
      expect(copy.closingTitle).not.toHaveLength(0);
    }
  });
});
