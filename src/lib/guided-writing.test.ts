import { describe, expect, it } from "vitest";
import { APP_LOCALES } from "@/lib/app-locale";
import {
  GUIDE_PROFILE_LABELS,
  GUIDE_PROFILES,
  GUIDE_STAGE_LABELS,
  PROFILE_TASK_TYPE,
  TARGET_LEVELS,
  TASK_GUIDE_STAGES,
  forEachGuidedWritingCell,
  getGuidedWritingTips,
  getGuideStagesForProfile,
} from "./guided-writing";

describe("GUIDED_WRITING_TIPS", () => {
  it("has complete, renderable French phrases for every profile/level/stage its task actually uses", () => {
    let cellCount = 0;
    forEachGuidedWritingCell(({ profile, level, stage, tips }) => {
      cellCount += 1;
      expect(Array.isArray(tips), `${profile}/${level}/${stage}`).toBe(true);
      expect(tips.length, `${profile}/${level}/${stage}`).toBeGreaterThanOrEqual(1);
      for (const tip of tips) {
        expect(typeof tip, `${profile}/${level}/${stage}`).toBe("string");
        expect(tip.trim().length, `${profile}/${level}/${stage}`).toBeGreaterThan(0);
      }
    });

    const expectedCellCount = GUIDE_PROFILES.reduce(
      (total, profile) => total + TARGET_LEVELS.length * getGuideStagesForProfile(profile).length,
      0,
    );
    expect(cellCount).toBe(expectedCellCount);
  });

  it("covers every locale and profile in GUIDE_PROFILE_LABELS", () => {
    for (const locale of APP_LOCALES) {
      for (const profile of GUIDE_PROFILES) {
        expect(GUIDE_PROFILE_LABELS[locale][profile].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has a stage label for every stage every task actually uses, in every locale", () => {
    for (const locale of APP_LOCALES) {
      for (const [taskType, stages] of Object.entries(TASK_GUIDE_STAGES)) {
        for (const stage of stages) {
          const label = GUIDE_STAGE_LABELS[locale][taskType as keyof typeof TASK_GUIDE_STAGES][stage];
          expect(label?.trim().length, `${locale}/${taskType}/${stage}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("getGuideStagesForProfile matches the profile's task stage sequence", () => {
    expect(getGuideStagesForProfile("INFORMAL_PERSONAL_MESSAGE")).toEqual(TASK_GUIDE_STAGES.TASK_1);
    expect(getGuideStagesForProfile("PUBLIC_LETTER")).toEqual(TASK_GUIDE_STAGES.TASK_2);
    expect(getGuideStagesForProfile("ARGUMENTATIVE_ANALYSIS")).toEqual(TASK_GUIDE_STAGES.TASK_3);
  });

  it("every profile maps to a task type", () => {
    for (const profile of GUIDE_PROFILES) {
      expect(PROFILE_TASK_TYPE[profile]).toBeDefined();
    }
  });

  it("getGuidedWritingTips returns the phrases the data module holds", () => {
    const tips = getGuidedWritingTips("ARGUMENTATIVE_ANALYSIS", "B2", "start");
    expect(tips.length).toBeGreaterThanOrEqual(1);
  });

  it("returns an empty array for a stage that isn't part of a profile's task", () => {
    expect(getGuidedWritingTips("ARGUMENTATIVE_ANALYSIS", "B2", "ask")).toEqual([]);
  });
});
