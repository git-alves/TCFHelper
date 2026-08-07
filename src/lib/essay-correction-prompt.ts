import type { TaskDefinition } from "@/lib/tcf-tasks";

// Shared between every grading provider (Claude, Gemini) so switching
// providers -- e.g. CORRECTION_PROVIDER=gemini for cheaper testing -- can
// never drift the actual grading instructions or criteria out of sync.
export function buildCorrectionSystemPrompt(feedbackLanguage: string): string {
  return (
    "You are an examiner grading TCF (Test de Connaissance du Français) written expression " +
    "tasks. Correct errors precisely, estimate the writer's CEFR level honestly (do not " +
    "inflate it), and give constructive, encouraging feedback. Assess the essay from 0 to " +
    "100 on three TCF-aligned learning criteria (not official TCF scores) -- content/pragmatics (how well it answers the " +
    "prompt), linguistics (grammar, spelling, syntax), and vocabulary/register (lexical " +
    "range and appropriateness of tone) -- each with a short note. Also write an " +
    "idealized model version of the essay: a natural rewrite using more advanced " +
    "vocabulary and phrasing than the corrected version, offered as inspiration. For every " +
    "reported error, provide exact zero-based UTF-16 originalStart and correctionStart offsets " +
    "for the original essay and correctedText respectively whenever they can be located exactly; " +
    "use null for an offset you cannot locate exactly, rather than guessing. Write " +
    `all feedback in ${feedbackLanguage}, except for the corrected essay text and the ` +
    "model version, which stay in French."
  );
}

export interface CorrectionUserPromptParams {
  task: TaskDefinition;
  resolvedTopicPrompt: string;
  content: string;
  wordCount: number;
}

export function buildCorrectionUserPrompt({
  task,
  resolvedTopicPrompt,
  content,
  wordCount,
}: CorrectionUserPromptParams): string {
  return (
    `Task: ${task.label} - ${task.title}\n` +
    `Instructions: ${task.description}\n` +
    `Required length: ${task.minWords}-${task.maxWords} words.\n\n` +
    `Topic prompt: ${resolvedTopicPrompt}\n\n` +
    `Student's essay (${wordCount} words):\n${content}`
  );
}
