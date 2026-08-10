import { describe, expect, it } from "vitest";
import { APP_COPY } from "@/lib/app-copy";
import { APP_LOCALES } from "@/lib/app-locale";
import { essayFeedbackSchema } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import { WALKTHROUGH_SAMPLE_ESSAY } from "@/lib/walkthrough-sample-essay";
import { getWalkthroughSampleFeedback, WALKTHROUGH_SAMPLE_CORRECTED_TEXT } from "@/lib/walkthrough-sample-feedback";

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("WALKTHROUGH_SAMPLE_ESSAY", () => {
  it("falls within Tâche 1's word range, the task the tour demos", () => {
    const count = wordCount(WALKTHROUGH_SAMPLE_ESSAY);
    expect(count).toBeGreaterThanOrEqual(TASK_INSTRUCTIONS.TASK_1.minWords);
    expect(count).toBeLessThanOrEqual(TASK_INSTRUCTIONS.TASK_1.maxWords);
  });
});

describe("getWalkthroughSampleFeedback", () => {
  it("produces schema-valid feedback for every locale, with real offsets into the sample text", () => {
    for (const locale of APP_LOCALES) {
      const feedback = getWalkthroughSampleFeedback(APP_COPY[locale]);
      expect(essayFeedbackSchema.safeParse(feedback).success).toBe(true);

      for (const error of feedback.errors) {
        expect(error.originalStart).toBeGreaterThanOrEqual(0);
        expect(error.correctionStart).toBeGreaterThanOrEqual(0);
        expect(
          WALKTHROUGH_SAMPLE_ESSAY.slice(error.originalStart!, error.originalStart! + error.original.length),
        ).toBe(error.original);
        expect(
          WALKTHROUGH_SAMPLE_CORRECTED_TEXT.slice(
            error.correctionStart!,
            error.correctionStart! + error.correction.length,
          ),
        ).toBe(error.correction);
      }
    }
  });
});
