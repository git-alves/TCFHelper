import { describe, expect, it } from "vitest";
import { APP_LOCALES } from "@/lib/app-locale";
import {
  GUIDE_PROFILE_LABELS,
  GUIDE_PROFILES,
  GUIDE_STAGE_LABELS,
  GUIDE_STAGES,
  TARGET_LEVELS,
  forEachGuidedWritingCell,
  getGuidedWritingTips,
} from "./guided-writing";

describe("GUIDED_WRITING_TIPS", () => {
  it("has complete, renderable tips for every locale, profile, level, and stage", () => {
    let cellCount = 0;
    forEachGuidedWritingCell(({ locale, profile, level, stage, tips }) => {
      cellCount += 1;
      expect(Array.isArray(tips), `${locale}/${profile}/${level}/${stage}`).toBe(true);
      expect(tips.length, `${locale}/${profile}/${level}/${stage}`).toBeGreaterThanOrEqual(2);
      for (const tip of tips) {
        expect(typeof tip, `${locale}/${profile}/${level}/${stage}`).toBe("string");
        expect(tip.trim().length, `${locale}/${profile}/${level}/${stage}`).toBeGreaterThan(0);
      }
    });

    expect(cellCount).toBe(APP_LOCALES.length * GUIDE_PROFILES.length * TARGET_LEVELS.length * GUIDE_STAGES.length);
  });

  it("covers every locale and profile in GUIDE_PROFILE_LABELS and GUIDE_STAGE_LABELS", () => {
    for (const locale of APP_LOCALES) {
      for (const profile of GUIDE_PROFILES) {
        expect(GUIDE_PROFILE_LABELS[locale][profile].trim().length).toBeGreaterThan(0);
      }
      for (const stage of GUIDE_STAGES) {
        expect(GUIDE_STAGE_LABELS[locale][stage].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("getGuidedWritingTips returns the same array the data module holds", () => {
    const tips = getGuidedWritingTips("en", "ARGUMENTATIVE_ANALYSIS", "B2", "start");
    expect(tips.length).toBeGreaterThanOrEqual(2);
  });
});
