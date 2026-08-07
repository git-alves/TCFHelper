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

export function getCorrectionRequestKey({ taskType, topic, content }: CorrectionRequestKeyInput): string | null {
  const normalizedContent = normalizeCorrectionInput(content);
  if (!taskType || !topic || !normalizedContent) return null;

  const normalizedTopic =
    topic.kind === "recent"
      ? topic.id.trim()
      : normalizeCorrectionInput(topic.prompt);
  if (!normalizedTopic) return null;

  return JSON.stringify({
    version: 1,
    taskType,
    topic: { kind: topic.kind, value: normalizedTopic },
    content: normalizedContent,
  });
}
