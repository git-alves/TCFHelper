import { NextResponse } from "next/server";
import { TaskType, TopicSource, type GuideProfile } from "@prisma/client";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { getRecentExamTopic, RecentExamTopicError } from "@/lib/recent-exam-topics";
import { classifyWritingContext } from "@/lib/guided-writing-classifier";

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

const SOURCE_MONTH_PATTERN = /:(\d{4}-\d{2}):/u;
const STORED_TOPIC_CANDIDATES = 40;
// How old a stored topic may be and still be offered when the live source is
// down: its source month must fall within this many months of today. Older
// prompts no longer say anything useful about the current exam, so beyond this
// the learner is told the source is unavailable instead.
const STORED_TOPIC_MAX_AGE_MONTHS = 6;

// "YYYY-MM" for the oldest source month still inside the window, in UTC to match
// how source months are derived (see getRecentExamSource).
function oldestAllowedSourceMonth(now: Date): string {
  const oldest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - STORED_TOPIC_MAX_AGE_MONTHS, 1));
  return `${oldest.getUTCFullYear()}-${String(oldest.getUTCMonth() + 1).padStart(2, "0")}`;
}

// The upstream site can be unreachable or answer automated requests with a bot
// challenge, and that must not leave learners with no exam prompt at all. Topics
// are stored the first time they are fetched (immutable, content-hashed rows),
// so serve one of those instead -- from the newest month we have for this task.
// Only trusted RECENT_EXAM rows are eligible, never learner-submitted topics.
async function findStoredRecentTopic(taskType: TaskType) {
  const rows = await prisma.topic.findMany({
    where: {
      source: TopicSource.RECENT_EXAM,
      taskType,
      retiredAt: null,
      sourceUrl: { not: null },
      externalRef: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: STORED_TOPIC_CANDIDATES,
    select: {
      id: true,
      taskType: true,
      title: true,
      prompt: true,
      sourceUrl: true,
      externalRef: true,
      guideContext: true,
    },
  });

  const oldestAllowed = oldestAllowedSourceMonth(new Date());
  const candidates = rows.flatMap((row) => {
    const sourceMonth = row.externalRef?.match(SOURCE_MONTH_PATTERN)?.[1];
    // "YYYY-MM" strings compare correctly as text.
    return sourceMonth && row.sourceUrl && sourceMonth >= oldestAllowed
      ? [{ ...row, sourceUrl: row.sourceUrl, sourceMonth }]
      : [];
  });
  if (candidates.length === 0) return null;

  const newestMonth = candidates.reduce((max, c) => (c.sourceMonth > max ? c.sourceMonth : max), "");
  const newest = candidates.filter((c) => c.sourceMonth === newestMonth);
  return newest[Math.floor(Math.random() * newest.length)];
}

// Our own bank of practice prompts (the managed OFFICIAL_EXAM starter topics,
// see starter-topics.ts), used when no live or recent stored exam topic can be
// offered. A random one per click; retired starter rows are never offered.
async function findPracticeTopic(taskType: TaskType) {
  const topics = await prisma.topic.findMany({
    where: { taskType, source: TopicSource.OFFICIAL_EXAM, retiredAt: null },
    select: { id: true, taskType: true, title: true, prompt: true, guideContext: true },
  });
  return topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : null;
}

async function practiceFallbackResponse(taskType: TaskType) {
  try {
    const practice = await findPracticeTopic(taskType);
    if (practice) return topicResponse(practice, null, false);
  } catch (practiceError) {
    console.error("Practice topic lookup failed", practiceError);
  }
  return null;
}

function topicResponse(
  topic: {
    id: string;
    taskType: TaskType;
    title: string;
    prompt: string;
    guideContext: GuideProfile | null;
  },
  source: { sourceUrl: string; sourceMonth: string } | null,
  previouslyPublished: boolean,
) {
  // An editorial override on the stored record always wins over the
  // deterministic classifier -- see docs/guided-writing.md's context-source
  // table. A freshly scraped recent-exam topic never has one yet, but a
  // later admin correction to this same immutable row is picked up here
  // without any other change.
  const guideContext = topic.guideContext
    ? { profile: topic.guideContext, confidence: "deterministic" as const }
    : classifyWritingContext(topic.taskType, topic.prompt);

  return NextResponse.json(
    {
      topic: {
        id: topic.id,
        taskType: topic.taskType,
        title: topic.title,
        prompt: topic.prompt,
        // Null for a practice prompt: it has no exam month or external source.
        sourceUrl: source?.sourceUrl ?? null,
        sourceMonth: source?.sourceMonth ?? null,
        // True only for a stored topic served after a live-retrieval failure, so
        // the client can disclose that it is not current exam content.
        previouslyPublished,
        // True for a prompt from our own practice bank: not an exam prompt at
        // all, and disclosed as such.
        practicePrompt: source === null,
        guideContext,
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function GET(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentActivatedAppUser>>;
  try {
    user = await getCurrentActivatedAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return NextResponse.json(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    throw error;
  }

  if (!user) {
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
        guideContext: true,
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

    return topicResponse(topic, { sourceUrl: recentTopic.sourceUrl, sourceMonth: recentTopic.sourceMonth }, false);
  } catch (error) {
    if (error instanceof RecentExamTopicError && error.code === "NOT_PUBLISHED") {
      // Nothing is wrong with the source, there is simply no exam page yet:
      // older stored exam topics would misrepresent that, so offer a clearly
      // labelled practice prompt instead, and only error if the bank is empty.
      return (await practiceFallbackResponse(taskType)) ?? notPublishedResponse();
    }

    console.error("Recent-exam topic retrieval failed", error);

    try {
      const stored = await findStoredRecentTopic(taskType);
      if (stored) {
        console.warn(`Serving stored recent-exam topic ${stored.id} (${stored.sourceMonth}) after a live retrieval failure`);
        return topicResponse(stored, { sourceUrl: stored.sourceUrl, sourceMonth: stored.sourceMonth }, true);
      }
    } catch (fallbackError) {
      console.error("Stored recent-exam topic lookup failed", fallbackError);
    }

    return (await practiceFallbackResponse(taskType)) ?? unavailableResponse();
  }
}
