import { describe, expect, it } from "vitest";
import { APP_LOCALES } from "@/lib/app-locale";
import { LANDING_PAGE_COPY } from "@/lib/landing-page-copy";

describe("landing page copy", () => {
  it("covers every supported landing-page language with the complete narrative", () => {
    for (const locale of APP_LOCALES) {
      const copy = LANDING_PAGE_COPY[locale];

      expect(copy.title).not.toHaveLength(0);
      expect(copy.beforeText).not.toHaveLength(0);
      expect(copy.afterText).not.toHaveLength(0);
      expect(copy.skills).toHaveLength(4);
      expect(copy.whyItems).toHaveLength(7);
      expect(copy.steps).toHaveLength(3);
      expect(copy.assessed).toHaveLength(4);
      expect(copy.faqs).toHaveLength(7);
    }
  });
});
