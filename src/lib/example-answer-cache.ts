import { createHash, randomUUID } from "node:crypto";
import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MODEL_ANSWER_PROMPT_VERSION, type ExampleCefrLevel } from "@/lib/gemini";
import type { ModelAnswerProvider } from "@/lib/model-answer-generator";

const FRESH_EXAMPLES_PER_DAY = 3;
const CLAIM_TRANSACTION_TIMEOUT_MS = 3_000;
// Gemini and the Cloudflare fallback can each use their 20-second request
// timeout. Keep the claim longer than that complete chain so a slow but valid
// fallback cannot lose ownership and trigger a duplicate provider call.
const LEASE_DURATION_MS = 60_000;

export function hashExampleTopic(taskType: TaskType, topicPrompt: string) {
  return createHash("sha256")
    .update(`${MODEL_ANSWER_PROMPT_VERSION}\n${taskType}\n${topicPrompt}`, "utf8")
    .digest("hex");
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfNextUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export type ExampleGenerationClaim =
  | { kind: "claimed"; claimToken: string }
  | { kind: "cached"; content: string }
  | { kind: "dailyLimit"; resetAt: Date }
  | { kind: "inProgress"; retryAt: Date };

/** A normal cache read lets a saved answer work even if all providers are down. */
export async function findCachedExample(
  userId: string,
  taskType: TaskType,
  level: ExampleCefrLevel,
  topicHash: string,
) {
  return prisma.exampleAnswer.findUnique({
    where: { userId_taskType_level_topicHash: { userId, taskType, level, topicHash } },
    select: { content: true },
  });
}

/**
 * Atomically checks the private cache, reserves a daily call, and records a
 * short-lived per-cache-key lease. The transaction lock makes the first two
 * concurrent requests deterministic; the durable lease protects the provider
 * call after the transaction commits.
 */
export async function claimExampleGeneration(
  userId: string,
  taskType: TaskType,
  level: ExampleCefrLevel,
  topicHash: string,
): Promise<ExampleGenerationClaim> {
  return prisma.$transaction(
    async (tx) => {
      const key = `${userId}:${taskType}:${level}:${topicHash}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;

      const cacheKey = { userId, taskType, level, topicHash };
      const cached = await tx.exampleAnswer.findUnique({
        where: { userId_taskType_level_topicHash: cacheKey },
        select: { content: true },
      });
      if (cached) return { kind: "cached", content: cached.content };

      const now = new Date();
      const lease = await tx.exampleGenerationLease.findUnique({
        where: { userId_taskType_level_topicHash: cacheKey },
        select: { expiresAt: true },
      });
      if (lease && lease.expiresAt > now) {
        return { kind: "inProgress", retryAt: lease.expiresAt };
      }

      // The same per-key lock protects an expired lease from being claimed by
      // two requests. The user lock additionally preserves the daily counter
      // when different topics are requested simultaneously.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
      const dayStartedAt = startOfUtcDay(now);
      const existing = await tx.exampleGenerationQuota.findUnique({ where: { userId } });
      const continuingDay = existing?.dayStartedAt.getTime() === dayStartedAt.getTime();
      const dailyRequestCount = (continuingDay ? existing.dailyRequestCount : 0) + 1;
      if (dailyRequestCount > FRESH_EXAMPLES_PER_DAY) {
        return { kind: "dailyLimit", resetAt: startOfNextUtcDay(now) };
      }

      await tx.exampleGenerationQuota.upsert({
        where: { userId },
        create: { userId, dayStartedAt, dailyRequestCount },
        update: { dayStartedAt, dailyRequestCount },
      });
      const claimToken = randomUUID();
      await tx.exampleGenerationLease.upsert({
        where: { userId_taskType_level_topicHash: cacheKey },
        create: { ...cacheKey, claimToken, expiresAt: new Date(now.getTime() + LEASE_DURATION_MS) },
        update: { claimToken, expiresAt: new Date(now.getTime() + LEASE_DURATION_MS) },
      });
      return { kind: "claimed", claimToken };
    },
    { timeout: CLAIM_TRANSACTION_TIMEOUT_MS },
  );
}

export async function cacheExample(
  userId: string,
  taskType: TaskType,
  level: ExampleCefrLevel,
  topicHash: string,
  content: string,
  provider: ModelAnswerProvider,
  claimToken: string,
) {
  const cacheKey = { userId, taskType, level, topicHash };
  return prisma.$transaction(async (tx) => {
    const key = `${userId}:${taskType}:${level}:${topicHash}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
    const lease = await tx.exampleGenerationLease.findUnique({
      where: { userId_taskType_level_topicHash: cacheKey },
      select: { claimToken: true },
    });
    // A timed-out request may finish after another request has taken over. It
    // must not write its response or remove the newer owner's lease.
    if (!lease || lease.claimToken !== claimToken) return null;
    const answer = await tx.exampleAnswer.upsert({
      where: { userId_taskType_level_topicHash: cacheKey },
      create: { ...cacheKey, content, provider },
      update: {},
      select: { content: true },
    });
    await tx.exampleGenerationLease.deleteMany({ where: { ...cacheKey, claimToken } });
    return answer;
  });
}

/** Releases a failed provider call early instead of making learners wait for the lease TTL. */
export async function releaseExampleGenerationLease(
  userId: string,
  taskType: TaskType,
  level: ExampleCefrLevel,
  topicHash: string,
  claimToken: string,
) {
  return prisma.exampleGenerationLease.deleteMany({
    where: { userId, taskType, level, topicHash, claimToken },
  });
}
