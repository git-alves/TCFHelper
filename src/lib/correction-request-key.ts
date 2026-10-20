/**
 * A stable, client-side identity for the input that a correction evaluates.
 *
 * This is deliberately not a hash or a security boundary. It lets the
 * workspace recognise an unchanged successful submission without flattening
 * meaningful paragraph or spacing edits. The server must still enforce any
 * durable cross-session deduplication policy when that feature is added.
 */
export type CorrectionTopicIdentity =
  | { kind: "recent"; id: string }
  | { kind: "custom"; prompt: string };

export interface CorrectionRequestKeyInput {
  taskType: string | null;
  topic: CorrectionTopicIdentity | null;
  content: string;
}

/**
 * Normalise only transport-level differences: CRLF versus LF, Unicode
 * composition, and accidental whitespace at either end. Internal whitespace
 * and paragraph structure remain part of the key because they can be a real
 * learner revision.
 */
export function normalizeCorrectionInput(value: string): string {
  return value.replace(/\r\n?/g, "\n").normalize("NFC").trim();
}

/**
 * The identity used to decide whether two drafts are "the same correction".
 * On top of normalizeCorrectionInput it ignores only formatting no examiner
 * would read as a different answer -- runs of spaces/tabs (including
 * non-breaking spaces) and trailing spaces on a line -- so that nudging a
 * space cannot buy a fresh (and, because the model is non-deterministic,
 * possibly different) grading.
 *
 * It deliberately keeps everything that changes the answer: the words
 * themselves (so deleting the space BETWEEN two words, which glues them into
 * one, still counts as an edit), punctuation, quote style, capitalisation,
 * and every line break, so paragraph structure stays distinct.
 *
 * This is a key only, never the text that is graded or stored. A reused
 * result's error offsets point into the originally stored essay, so callers
 * must keep rendering it against that stored text (see the history detail
 * page and the workspace's submittedCorrectionText), never the newer draft.
 */
export function canonicalizeCorrectionInput(value: string): string {
  return normalizeCorrectionInput(value)
    .replace(/[^\S\n]+/g, " ")
    .replace(/ \n/g, "\n")
    .trim();
}

export function getCorrectionRequestKey({ taskType, topic, content }: CorrectionRequestKeyInput): string | null {
  const normalizedContent = canonicalizeCorrectionInput(content);
  if (!taskType || !topic || !normalizedContent) return null;

  const normalizedTopic =
    topic.kind === "recent"
      ? topic.id.trim()
      : canonicalizeCorrectionInput(topic.prompt);
  if (!normalizedTopic) return null;

  // `version` is intentionally not bumped for the canonicalisation above: a
  // draft with no extra formatting canonicalises to exactly the string it
  // always did, so its stored correctionKeyHash still matches. Only a
  // previously-saved draft that contained such formatting hashes differently
  // now and would be graded once more if resubmitted unchanged.
  return JSON.stringify({
    version: 1,
    taskType,
    topic: { kind: topic.kind, value: normalizedTopic },
    content: normalizedContent,
  });
}
