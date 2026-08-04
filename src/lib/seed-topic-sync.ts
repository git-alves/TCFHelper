import type { PrismaClient, TaskType } from "@prisma/client";
import { TopicSource } from "@prisma/client";

export interface SeedTopic {
  taskType: TaskType;
  title: string;
  prompt: string;
}

export interface SeedTopicSyncResult {
  created: number;
  updated: number;
  unchanged: number;
}

/**
 * Reconciles the app-managed starter bank without ever changing a learner,
 * recent-exam, or AI-generated topic. This makes a re-run safe when the
 * starter bank receives a corrected prompt format.
 */
export async function syncSeedTopics(
  prisma: Pick<PrismaClient, "topic">,
  topics: readonly SeedTopic[],
): Promise<SeedTopicSyncResult> {
  const result: SeedTopicSyncResult = { created: 0, updated: 0, unchanged: 0 };

  for (const topic of topics) {
    const existing = await prisma.topic.findFirst({
      where: { title: topic.title, taskType: topic.taskType, source: TopicSource.OFFICIAL_EXAM },
      select: { id: true, prompt: true },
    });

    if (!existing) {
      await prisma.topic.create({ data: { ...topic, source: TopicSource.OFFICIAL_EXAM } });
      result.created += 1;
    } else if (existing.prompt !== topic.prompt) {
      await prisma.topic.update({ where: { id: existing.id }, data: { prompt: topic.prompt } });
      result.updated += 1;
    } else {
      result.unchanged += 1;
    }
  }

  return result;
}
