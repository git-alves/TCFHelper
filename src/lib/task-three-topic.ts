// A recent-exam Task 3 topicPrompt is always built by parseTaskThree in
// recent-exam-topics.ts, which formats it as a title followed by literal
// "Document 1 :" / "Document 2 :" sections. A custom (learner-pasted) Task 3
// topic is free text and may not contain two opposing-viewpoint documents at
// all -- both the example generator (gemini.ts) and the correction prompt
// (essay-correction-prompt.ts) need to agree on this same detection so a
// custom topic is never pushed to synthesize documents that don't exist.
const TASK_THREE_DOCUMENT_PATTERN = /Document\s*1\s*:[\s\S]*Document\s*2\s*:/iu;

export function hasTaskThreeDocuments(topicPrompt: string): boolean {
  return TASK_THREE_DOCUMENT_PATTERN.test(topicPrompt);
}
