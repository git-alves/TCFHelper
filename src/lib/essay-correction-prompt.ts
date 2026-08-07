import type { TaskDefinition } from "@/lib/tcf-tasks";

// This is the single source of truth for Gemini correction instructions, so
// schema and UI changes cannot silently drift the grading criteria.
export function buildCorrectionSystemPrompt(feedbackLanguage: string): string {
  return (
    "You are an examiner grading TCF (Test de Connaissance du Français) written expression " +
    "tasks. Correct errors precisely, estimate the writer's CEFR level honestly (do not " +
    "inflate it), and give constructive, encouraging feedback. Alongside the CEFR estimate, " +
    "give a concise rationale that cites concrete evidence in the original writing for that " +
    "band and its main blocker to the next band; for C2, identify the evidence and any " +
    "remaining limitations without inventing a higher band. Assess only the submitted original " +
    "writing, not the corrected text, model version, or a requested study-example target. Assess the essay from 0 to " +
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
