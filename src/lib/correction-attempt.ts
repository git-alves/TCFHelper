/**
 * What clicking "Correct" should do, decided up front so the caller never
 * has to re-derive the guard order itself.
 *
 * The minimum-word check must run before `correctionRequestKey` is
 * consulted: an empty draft normalizes to a null key (see
 * getCorrectionRequestKey), and checking the key first would silently
 * swallow the attempt instead of surfacing the word-count warning for the
 * shortest possible draft.
 */
export type CorrectAttemptOutcome =
  | { kind: "blocked" }
  | { kind: "belowMinimum" }
  | { kind: "ready"; correctionRequestKey: string };

export interface CorrectAttemptInput {
  taskType: string | null;
  activeTopicPrompt: string;
  task: { minWords: number } | null;
  isTopicLoading: boolean;
  isCorrecting: boolean;
  isCorrectionInProgressElsewhere: boolean;
  isCurrentDraftAlreadyCorrected: boolean;
  wordCount: number;
  correctionRequestKey: string | null;
}

export function getCorrectAttemptOutcome({
  taskType,
  activeTopicPrompt,
  task,
  isTopicLoading,
  isCorrecting,
  isCorrectionInProgressElsewhere,
  isCurrentDraftAlreadyCorrected,
  wordCount,
  correctionRequestKey,
}: CorrectAttemptInput): CorrectAttemptOutcome {
  if (
    !taskType ||
    !activeTopicPrompt ||
    !task ||
    isTopicLoading ||
    isCorrecting ||
    isCorrectionInProgressElsewhere ||
    isCurrentDraftAlreadyCorrected
  ) {
    return { kind: "blocked" };
  }

  if (wordCount < task.minWords) {
    return { kind: "belowMinimum" };
  }

  if (!correctionRequestKey) {
    return { kind: "blocked" };
  }

  return { kind: "ready", correctionRequestKey };
}
