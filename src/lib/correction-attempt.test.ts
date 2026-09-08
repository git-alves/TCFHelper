import { describe, expect, it } from "vitest";
import { getCorrectAttemptOutcome, type CorrectAttemptInput } from "./correction-attempt";

const baseInput: CorrectAttemptInput = {
  taskType: "TASK_2",
  activeTopicPrompt: "Vous écrivez à votre voisin.",
  task: { minWords: 60 },
  isTopicLoading: false,
  isCorrecting: false,
  isCorrectionInProgressElsewhere: false,
  isCurrentDraftAlreadyCorrected: false,
  wordCount: 0,
  correctionRequestKey: null,
};

describe("getCorrectAttemptOutcome", () => {
  it("flags an empty draft as below the minimum instead of silently blocking it", () => {
    // An empty draft normalizes to a null correctionRequestKey. The word-count
    // check must still fire so the learner sees why nothing happened.
    expect(getCorrectAttemptOutcome(baseInput)).toEqual({ kind: "belowMinimum" });
  });

  it("flags a short but non-empty draft as below the minimum", () => {
    expect(
      getCorrectAttemptOutcome({ ...baseInput, wordCount: 59, correctionRequestKey: "key" }),
    ).toEqual({ kind: "belowMinimum" });
  });

  it("is ready once the draft reaches the minimum and has a request key", () => {
    expect(
      getCorrectAttemptOutcome({ ...baseInput, wordCount: 60, correctionRequestKey: "key" }),
    ).toEqual({ kind: "ready", correctionRequestKey: "key" });
  });

  it("blocks when nothing is selected yet, regardless of word count", () => {
    expect(getCorrectAttemptOutcome({ ...baseInput, taskType: null })).toEqual({ kind: "blocked" });
    expect(getCorrectAttemptOutcome({ ...baseInput, activeTopicPrompt: "" })).toEqual({ kind: "blocked" });
    expect(getCorrectAttemptOutcome({ ...baseInput, task: null })).toEqual({ kind: "blocked" });
  });

  it("blocks while a correction is already in flight or already applied", () => {
    expect(
      getCorrectAttemptOutcome({ ...baseInput, wordCount: 60, isCorrecting: true }),
    ).toEqual({ kind: "blocked" });
    expect(
      getCorrectAttemptOutcome({ ...baseInput, wordCount: 60, isCorrectionInProgressElsewhere: true }),
    ).toEqual({ kind: "blocked" });
    expect(
      getCorrectAttemptOutcome({ ...baseInput, wordCount: 60, isCurrentDraftAlreadyCorrected: true }),
    ).toEqual({ kind: "blocked" });
  });
});
