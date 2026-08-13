import type { PrismaClient, TaskType } from "@prisma/client";
import { TopicSource } from "@prisma/client";

export interface SeedTopic {
  taskType: TaskType;
  title: string;
  prompt: string;
}

export interface SeedTopicSyncResult {
  created: number;
  // A retired-and-replaced pair, not an in-place update -- see syncSeedTopics.
  retired: number;
  unchanged: number;
}

/**
 * Reconciles the app-managed starter bank without ever changing a learner,
 * recent-exam, or AI-generated topic. Safe to re-run when the starter bank
 * receives a corrected prompt format: a topic whose title already exists but
 * whose prompt text has changed is never updated in place. An essay
 * references its topic only by id, and the shared-topic correction-request
 * key (getCorrectionRequestKey) is based on that same id, not the prompt
 * content -- mutating a live row's prompt would silently reassign the
 * grading context (and correction identity) of every essay that already
 * points at it, including one a learner is mid-draft against during this
 * exact deploy. Instead, the existing row is retired (retiredAt set, source
 * and prompt untouched) and a new row is created with the corrected prompt,
 * mirroring the immutability RECENT_EXAM topics already have via their
 * content-hash externalRef.
 *
 * retiredAt, not a new TopicSource value: retiring a row must stay invisible
 * to whichever app version is still live while this seed step runs during a
 * rolling deploy (see runLockedSeedTopicSync/deploy-seed-topics.ts) -- an
 * additive column old code never reads leaves its acceptance of an
 * OFFICIAL_EXAM topic completely unaffected, where a new enum value the old
 * code's SHARED_TOPIC_SOURCES doesn't recognise would reject it outright
 * until traffic fully cuts over.
 */
export async function syncSeedTopics(
  prisma: Pick<PrismaClient, "topic">,
  topics: readonly SeedTopic[],
): Promise<SeedTopicSyncResult> {
  const result: SeedTopicSyncResult = { created: 0, retired: 0, unchanged: 0 };

  for (const topic of topics) {
    // orderBy makes the match deterministic if a pre-existing duplicate row
    // (title, taskType, source, retiredAt: null) already exists; it does not
    // retire or merge that duplicate, which remains a separate data-hygiene
    // concern this sync does not attempt to resolve.
    const existing = await prisma.topic.findFirst({
      where: { title: topic.title, taskType: topic.taskType, source: TopicSource.OFFICIAL_EXAM, retiredAt: null },
      select: { id: true, prompt: true },
      orderBy: { id: "asc" },
    });

    if (!existing) {
      await prisma.topic.create({ data: { ...topic, source: TopicSource.OFFICIAL_EXAM } });
      result.created += 1;
    } else if (existing.prompt !== topic.prompt) {
      await prisma.topic.update({
        where: { id: existing.id },
        data: { retiredAt: new Date() },
      });
      await prisma.topic.create({ data: { ...topic, source: TopicSource.OFFICIAL_EXAM } });
      result.retired += 1;
    } else {
      result.unchanged += 1;
    }
  }

  return result;
}

// A fixed key, not per-topic: the whole bank is reconciled as one unit, so
// one lock serializes concurrent syncs (two production builds racing, or a
// manual `npm run db:seed` racing a deploy) the same way a per-row unique
// constraint would, without a database-level identity beyond (title,
// taskType, source) that a concurrent run's own in-flight write could still
// race past. Deliberately kept as the exact string the very first guarded
// deploy wrapper used (not renamed when this locking moved into a shared
// helper): an older, already-deployed build's process could still be running
// this same seed step during a rolling deploy, and it must acquire the same
// Postgres advisory lock this build does to actually serialize against it --
// a new key here would silently stop protecting against that overlap.
const SEED_TOPIC_SYNC_LOCK_KEY = "deploy-seed-topics";

/**
 * The entrypoint every caller (the manual `npm run db:seed` script and the
 * guarded production deploy wrapper alike) should use, so neither can race
 * the other: syncSeedTopics's per-topic findFirst-then-write is only safe
 * run by one caller at a time.
 */
export async function runLockedSeedTopicSync(
  prisma: PrismaClient,
  topics: readonly SeedTopic[],
): Promise<SeedTopicSyncResult> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SEED_TOPIC_SYNC_LOCK_KEY})::bigint)`;
      return syncSeedTopics(tx, topics);
    },
    { timeout: 30_000 },
  );
}
