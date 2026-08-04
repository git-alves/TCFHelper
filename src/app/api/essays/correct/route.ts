import { NextResponse } from "next/server";
import { z } from "zod";
import { EssayStatus, TaskType, TopicSource } from "@prisma/client";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import { essayFeedbackSchema } from "@/lib/essay-feedback";
import { APP_LOCALES, APP_LOCALE_LANGUAGE_NAMES, DEFAULT_APP_LOCALE } from "@/lib/app-locale";

const TASK_TYPES = Object.values(TaskType) as [TaskType, ...TaskType[]];
const SHARED_TOPIC_SOURCES = new Set<TopicSource>([
  TopicSource.OFFICIAL_EXAM,
  TopicSource.RECENT_EXAM,
  TopicSource.AI_GENERATED,
]);

const requestSchema = z.object({
  taskType: z.enum(TASK_TYPES),
  topicId: z.string().min(1).optional(),
  topicPrompt: z.string().trim().min(1).max(2000).optional(),
  content: z.string().trim().min(1).max(20000),
  locale: z.enum(APP_LOCALES).default(DEFAULT_APP_LOCALE),
}).superRefine((data, ctx) => {
  if (!data.topicId && !data.topicPrompt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["topicPrompt"],
      message: "Provide a topic prompt or a topic ID.",
    });
  }
});

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentAppUser>>;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return NextResponse.json(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { taskType, topicId, topicPrompt: submittedTopicPrompt, content, locale } = parsed.data;
  const task = TASK_INSTRUCTIONS[taskType];
  const wordCount = countWords(content);
  const feedbackLanguage = APP_LOCALE_LANGUAGE_NAMES[locale];

  let resolvedTopicId: string;
  let resolvedTopicPrompt: string;
  if (topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    // `topicId` represents a server-authoritative shared source (the legacy
    // official bank or an imported recent-exam topic). Learner-supplied prompts
    // must enter through `topicPrompt`, never be addressable by a shared ID
    // that could link another learner's private prompt.
    if (!topic || topic.taskType !== taskType || !SHARED_TOPIC_SOURCES.has(topic.source)) {
      return NextResponse.json({ error: "Unknown topic." }, { status: 400 });
    }
    resolvedTopicId = topic.id;
    // A server-issued topic ID is the source of truth. Never let the client
    // pair an existing topic record with a different grading prompt.
    resolvedTopicPrompt = topic.prompt;
  } else {
    // The schema refinement above guarantees a prompt for this branch.
    const topicPrompt = submittedTopicPrompt!;
    const userTopic = await prisma.topic.create({
      data: {
        taskType,
        title: topicPrompt.slice(0, 80),
        prompt: topicPrompt,
        source: TopicSource.USER_SUBMITTED,
      },
    });
    resolvedTopicId = userTopic.id;
    resolvedTopicPrompt = userTopic.prompt;
  }

  let feedback;
  try {
    const response = await anthropic.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(essayFeedbackSchema),
      },
      system:
        "You are an examiner grading TCF (Test de Connaissance du Français) written expression " +
        "tasks. Correct errors precisely, estimate the writer's CEFR level honestly (do not " +
        `inflate it), and give constructive, encouraging feedback. Write all feedback in ` +
        `${feedbackLanguage}, except for the corrected essay text itself, which stays in French.`,
      messages: [
        {
          role: "user",
          content:
            `Task: ${task.label} - ${task.title}\n` +
            `Instructions: ${task.description}\n` +
            `Required length: ${task.minWords}-${task.maxWords} words.\n\n` +
            `Topic prompt: ${resolvedTopicPrompt}\n\n` +
            `Student's essay (${wordCount} words):\n${content}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The essay could not be reviewed. Please try again." },
        { status: 502 }
      );
    }

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Could not parse feedback. Please try again." },
        { status: 502 }
      );
    }

    feedback = response.parsed_output;
  } catch (error) {
    console.error("Essay correction failed", error);
    return NextResponse.json(
      { error: "Something went wrong while grading your essay." },
      { status: 502 }
    );
  }

  const essay = await prisma.essay.create({
    data: {
      userId: user.id,
      topicId: resolvedTopicId,
      taskType,
      content,
      wordCount,
      status: EssayStatus.SUBMITTED,
      feedback: {
        create: {
          level: feedback.cefrLevel,
          summary: feedback.summary,
          meetsWordCount: feedback.meetsWordCount,
          grammarNotes: {
            correctedText: feedback.correctedText,
            wordCountNote: feedback.wordCountNote,
            errors: feedback.errors,
          },
          suggestions: feedback.suggestions,
        },
      },
    },
  });

  return NextResponse.json({ essayId: essay.id, feedback });
}
