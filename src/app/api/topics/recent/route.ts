import { NextResponse } from "next/server";
import { TaskType, TopicSource } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentExamTopic, RecentExamTopicError } from "@/lib/recent-exam-topics";

const TASK_TYPES = Object.values(TaskType);
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function unavailableResponse() {
  return NextResponse.json(
    {
      error:
        "The recent-exam topic is unavailable. Please write or paste your own topic.",
    },
    { status: 502, headers: NO_STORE_HEADERS }
  );
}

function notPublishedResponse() {
  return NextResponse.json(
    {
      error:
        "No recent-exam topics have been published for this month or the previous month. Please write or paste your own topic.",
      code: "RECENT_EXAM_NOT_PUBLISHED",
    },
    { status: 404, headers: NO_STORE_HEADERS },
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedTaskType = searchParams.get("taskType");
  if (!requestedTaskType || !TASK_TYPES.includes(requestedTaskType as TaskType)) {
    return NextResponse.json(
      { error: "Invalid taskType." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const taskType = requestedTaskType as TaskType;

  try {
    // The retrieval library constructs the authorised month URL itself and
    // only returns validated source content. The browser never supplies a
    // prompt, month, source URL, or external reference for this path.
    const recentTopic = await getRecentExamTopic(taskType);
    if (recentTopic.taskType !== taskType) {
      throw new Error("Recent-exam source returned a topic for a different task.");
    }

    // The external reference includes the source content hash. An unchanged
    // upstream prompt reuses its record; revised content gets a new record,
    // keeping the topic context for existing essays immutable.
    const topic = await prisma.topic.upsert({
      where: { externalRef: recentTopic.externalRef },
      create: {
        taskType: recentTopic.taskType,
        title: recentTopic.title,
        prompt: recentTopic.prompt,
        source: TopicSource.RECENT_EXAM,
        sourceUrl: recentTopic.sourceUrl,
        externalRef: recentTopic.externalRef,
      },
      update: {},
      select: {
        id: true,
        taskType: true,
        title: true,
        prompt: true,
        source: true,
        sourceUrl: true,
      },
    });

    // A normally-created user topic has no externalRef, but fail closed if a
    // manually corrupted row ever collides with a trusted source reference.
    if (
      topic.source !== TopicSource.RECENT_EXAM ||
      topic.taskType !== taskType ||
      topic.sourceUrl !== recentTopic.sourceUrl ||
      topic.title !== recentTopic.title ||
      topic.prompt !== recentTopic.prompt
    ) {
      throw new Error("Recent-exam topic provenance did not match the request.");
    }

    return NextResponse.json(
      {
        topic: {
          id: topic.id,
          taskType: topic.taskType,
          title: topic.title,
          prompt: topic.prompt,
          sourceUrl: recentTopic.sourceUrl,
          sourceMonth: recentTopic.sourceMonth,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof RecentExamTopicError && error.code === "NOT_PUBLISHED") {
      return notPublishedResponse();
    }

    console.error("Recent-exam topic retrieval failed", error);
    return unavailableResponse();
  }
}
