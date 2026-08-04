import { createHash } from "node:crypto";
import { z } from "zod";
import type { TaskType } from "@prisma/client";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "@/lib/anthropic";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";

const MAX_TITLE_CHARS = 120;
const MAX_PROMPT_CHARS = 2000;
const MAX_IMAGE_PROMPT_CHARS = 500;

export const generatedTopicSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_CHARS).describe("A short French title for the topic."),
  prompt: z
    .string()
    .min(1)
    .max(MAX_PROMPT_CHARS)
    .describe("The full French topic prompt text, in the exact structure requested."),
  imagePrompt: z
    .string()
    .min(1)
    .max(MAX_IMAGE_PROMPT_CHARS)
    .optional()
    .describe(
      "English description of a neutral, generic illustrative photo for this topic. Only set when explicitly requested for this task.",
    ),
});

export type GeneratedTopicContent = z.infer<typeof generatedTopicSchema>;

export interface GeneratedTopic extends GeneratedTopicContent {
  taskType: TaskType;
  externalRef: string;
}

export class TopicGenerationError extends Error {}

// Task 3 is the only task whose real-exam format sometimes grounds a
// document in a photo rather than only text (see AGENTS/phase-2 discussion),
// and it is the highest-difficulty task (targeting B2-C1-C2 writing), so it
// is the only one that also asks for an illustrative image prompt.
const TASK_FORMAT_INSTRUCTIONS: Record<TaskType, string> = {
  TASK_1:
    "Write a short informal or semi-formal writing scenario (a message, letter, or email) that gives the " +
    "writer a clear recipient, a reason to write, and one to three concrete points to cover. Return only " +
    '"title" (a short French label for the scenario) and "prompt" (the scenario itself, in French, phrased ' +
    'as an instruction such as "Écrivez un message/e-mail/lettre à ... pour ...").',
  TASK_2:
    "Write an everyday topic that asks the writer to give and justify a personal opinion with reasons and " +
    'examples. Return only "title" (a short French label) and "prompt" (one or two French sentences posing ' +
    "the question and asking for a justified opinion).",
  TASK_3:
    "Write a debate-style topic about a contemporary societal issue with two opposing or contrasting " +
    "viewpoints, in the same structure used by the official exam: a short title, then a first viewpoint, " +
    'then a contrasting second viewpoint. Return "title" (the debate\'s short French title) and "prompt" ' +
    "formatted exactly as:\n" +
    "{title}\n\nDocument 1 :\n{first viewpoint, a short French paragraph}\n\nDocument 2 :\n{second viewpoint, a short French paragraph}\n\n" +
    'Also return "imagePrompt": a short English description of a neutral, generic, original illustrative ' +
    "photo evoking this topic's theme (for example a scene, an everyday object, or an activity) - never a " +
    "real, identifiable person, brand, logo, or copyrighted artwork.",
};

/**
 * Asks Claude for a brand-new practice topic matching the official exam's
 * format and difficulty for the given task, without copying or paraphrasing
 * any real exam content. Task 3 additionally asks for an image prompt.
 */
export async function generateTopic(taskType: TaskType): Promise<GeneratedTopic> {
  const task = TASK_INSTRUCTIONS[taskType];

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(generatedTopicSchema),
    },
    system:
      "You write brand-new, original practice topics for TCF (Test de Connaissance du Français) written " +
      "expression practice. Every topic must be wholly original: never copy, closely paraphrase, or " +
      "reconstruct any real, existing TCF exam question or a topic from any specific known source. Match " +
      "the official exam's task format and difficulty, not its content. All French text must be natural " +
      "and grammatically correct.",
    messages: [
      {
        role: "user",
        content:
          `Task: ${task.label} - ${task.title}\n` +
          `Official instructions: ${task.description}\n` +
          `Target length for a response: ${task.minWords}-${task.maxWords} words.\n\n` +
          TASK_FORMAT_INSTRUCTIONS[taskType],
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new TopicGenerationError("Claude did not return a usable generated topic.");
  }

  const content = response.parsed_output;

  return {
    ...content,
    taskType,
    externalRef: createExternalRef(taskType, content),
  };
}

function createExternalRef(taskType: TaskType, content: GeneratedTopicContent): string {
  const contentHash = createHash("sha256")
    .update(`${taskType} ${content.title} ${content.prompt}`, "utf8")
    .digest("hex")
    .slice(0, 24);
  return `ai-generated:${taskType}:${contentHash}`;
}
