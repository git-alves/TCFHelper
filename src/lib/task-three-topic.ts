// A recent-exam Task 3 topicPrompt is always built by parseTaskThree in
// recent-exam-topics.ts, which formats it as a title followed by literal
// "Document 1 :" / "Document 2 :" sections, each label on its own line
// followed by real body text on the next line(s). A custom (learner-pasted)
// Task 3 topic is free text and may not contain two opposing-viewpoint
// documents at all -- both the example generator (gemini.ts) and the
// correction prompt (essay-correction-prompt.ts) need to agree on this same
// detection so a custom topic is never pushed to synthesize documents that
// don't exist.
//
// Detection requires each label to start its own line (so a prompt that
// merely mentions "Document 1:" inline, mid-sentence, doesn't count -- there
// must be nothing but leading whitespace before it on that line) and
// requires real non-blank content in both the section between the two
// labels and the section after the second label (so two adjacent,
// empty-bodied labels don't count either). Content may appear on the same
// line as the label, after the colon (e.g. a pasted "Document 1 : Les
// téléphones distraient les élèves."), on the following line(s) as in the
// real recent-exam format, or both.
const DOCUMENT_ONE_LABEL_PATTERN = /^\s*Document\s*1\s*:(.*)$/iu;
const DOCUMENT_TWO_LABEL_PATTERN = /^\s*Document\s*2\s*:(.*)$/iu;

function findLabelLine(
  lines: string[],
  pattern: RegExp,
  fromIndex: number,
): { index: number; sameLineContent: string } | null {
  for (let index = fromIndex; index < lines.length; index += 1) {
    const match = pattern.exec(lines[index]);
    if (match) return { index, sameLineContent: match[1] };
  }
  return null;
}

function hasNonBlankContent(sameLineContent: string, followingLines: string[]): boolean {
  return sameLineContent.trim().length > 0 || followingLines.some((line) => line.trim().length > 0);
}

export function hasTaskThreeDocuments(topicPrompt: string): boolean {
  // Splitting on "\n" alone would leave a trailing "\r" on every line of
  // CRLF-encoded input (e.g. a topic pasted from Windows). That trailing
  // "\r" then sits between the label's captured content and the regex's `$`
  // anchor -- `.` never matches a line terminator, so the whole label match
  // silently fails and a genuine two-document topic is misclassified as
  // documentless. Splitting on either line-ending form up front keeps the
  // rest of this function's logic platform-neutral.
  const lines = topicPrompt.split(/\r?\n/);

  const documentOne = findLabelLine(lines, DOCUMENT_ONE_LABEL_PATTERN, 0);
  if (!documentOne) return false;

  const documentTwo = findLabelLine(lines, DOCUMENT_TWO_LABEL_PATTERN, documentOne.index + 1);
  if (!documentTwo) return false;

  return (
    hasNonBlankContent(documentOne.sameLineContent, lines.slice(documentOne.index + 1, documentTwo.index)) &&
    hasNonBlankContent(documentTwo.sameLineContent, lines.slice(documentTwo.index + 1))
  );
}
