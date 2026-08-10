import { createHash, randomUUID } from "node:crypto";
import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MODEL_ANSWER_PROMPT_VERSION, type ExampleCefrLevel } from "@/lib/gemini";
import type { ModelAnswerProvider } from "@/lib/model-answer-generator";
import { resolveUserQuotaLimits } from "@/lib/user-quota-limits";

const CLAIM_TRANSACTION_TIMEOUT_MS = 3_000;
// Gemini can use its 20-second request timeout. Keep the claim longer than
// that call so a slow but valid response cannot lose ownership and trigger a
// duplicate provider request.
const LEASE_DURATION_MS = 60_000;
// A refunded failure never raises the daily count, so that count alone no
// longer bounds how often a persistently failing provider gets called. This
// cooldown between claim attempts (for any topic) is what actually caps the
// call rate during an outage; it is not tied to success or failure, so it
// stays simple to reason about and only ever costs a few seconds of
// legitimate back-to-back use.
const CLAIM_COOLDOWN_MS = 10_000;
// A refunded failure never raises dailyRequestCount, so it alone cannot cap
// how many times a persistently failing provider gets called in a day — the
// cooldown above only bounds the burst rate, not the total. This cap is
// checked against dailyAttemptCount, a counter that rises on every claim and
// is never refunded, so it durably bounds total daily attempts (successful
// or not) independent of the cooldown and independent of refunds.
// An administrator can explicitly grant a higher daily allowance. The
// cooldown (CLAIM_COOLDOWN_MS) still bounds burst rate regardless.
const DAILY_ATTEMPT_CAP = 1000;

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
  | { kind: "inProgress"; retryAt: Date }
  | { kind: "cooldown"; retryAt: Date };

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

      let now = new Date();
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
      // Recomputed after this (possibly blocking) lock, not reused from
      // above: a long wait here must never let a stale pre-wait timestamp
      // compute the wrong UTC day for the reservation.
      now = new Date();
      const [existing, overrides] = await Promise.all([
        tx.exampleGenerationQuota.findUnique({ where: { userId } }),
        tx.userQuotaOverride.findUnique({
          where: { userId },
          select: { exampleGenerationsPerDay: true },
        }),
      ]);
      const limits = resolveUserQuotaLimits(overrides);

      if (existing?.lastAttemptAt) {
        const cooldownEndsAt = new Date(existing.lastAttemptAt.getTime() + CLAIM_COOLDOWN_MS);
        if (cooldownEndsAt > now) {
          return { kind: "cooldown", retryAt: cooldownEndsAt };
        }
      }

      const dayStartedAt = startOfUtcDay(now);
      const continuingDay = existing?.dayStartedAt.getTime() === dayStartedAt.getTime();

      // Checked before, and independent of, the refundable count below: a
      // string of refunded failures must not let this claim through forever.
      const dailyAttemptCount = (continuingDay ? existing.dailyAttemptCount : 0) + 1;
      if (dailyAttemptCount > Math.max(DAILY_ATTEMPT_CAP, limits.exampleGenerationsPerDay)) {
        return { kind: "dailyLimit", resetAt: startOfNextUtcDay(now) };
      }

      const dailyRequestCount = (continuingDay ? existing.dailyRequestCount : 0) + 1;
      if (dailyRequestCount > limits.exampleGenerationsPerDay) {
        return { kind: "dailyLimit", resetAt: startOfNextUtcDay(now) };
      }

      await tx.exampleGenerationQuota.upsert({
        where: { userId },
        create: { userId, dayStartedAt, dailyRequestCount, dailyAttemptCount, lastAttemptAt: now },
        update: { dayStartedAt, dailyRequestCount, dailyAttemptCount, lastAttemptAt: now },
      });
      const claimToken = randomUUID();
      await tx.exampleGenerationLease.upsert({
        where: { userId_taskType_level_topicHash: cacheKey },
        create: { ...cacheKey, claimToken, dayStartedAt, expiresAt: new Date(now.getTime() + LEASE_DURATION_MS) },
        update: { claimToken, dayStartedAt, expiresAt: new Date(now.getTime() + LEASE_DURATION_MS) },
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

/**
 * Cleans up a lease early (instead of making a concurrent request wait for
 * its TTL) WITHOUT refunding the daily slot it reserved. Use this when the
 * learner already received a valid generated answer — the provider call
 * succeeded — but a secondary step (caching it) failed; they got real value
 * from their reserved slot, so it must still count. For a failed provider
 * call, where the learner received nothing, use refundExampleGenerationLease
 * instead.
 */
export async function releaseExampleGenerationLease(
  userId: string,
  taskType: TaskType,
  level: ExampleCefrLevel,
  topicHash: string,
  claimToken: string,
) {
  return prisma.$transaction(async (tx) => {
    const key = `${userId}:${taskType}:${level}:${topicHash}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
    return tx.exampleGenerationLease.deleteMany({ where: { userId, taskType, level, topicHash, claimToken } });
  });
}

/**
 * Cleans up a lease AND refunds the daily slot it reserved. Use this only
 * when the provider call itself failed and the learner received nothing for
 * the slot they spent.
 *
 * Takes the same per-key -> per-user advisory lock order as
 * claimExampleGeneration, so a concurrent claim's read-then-write cannot
 * interleave with this refund and silently overwrite it with a stale
 * computed count (a lost-update race) — claimExampleGeneration's own update
 * writes an absolute value it read earlier in its transaction, not a
 * relative increment, so it is not safe against an unsynchronized
 * concurrent decrement.
 *
 * Refunds only the exact UTC day the reservation was made for, read back
 * from the lease itself rather than recomputed as "today": a reservation
 * claimed just before midnight must never refund a request made just after
 * it, even though both would look like "today" at different points in time.
 */
export async function refundExampleGenerationLease(
  userId: string,
  taskType: TaskType,
  level: ExampleCefrLevel,
  topicHash: string,
  claimToken: string,
) {
  const cacheKey = { userId, taskType, level, topicHash };
  return prisma.$transaction(async (tx) => {
    const key = `${userId}:${taskType}:${level}:${topicHash}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;

    const lease = await tx.exampleGenerationLease.findUnique({
      where: { userId_taskType_level_topicHash: cacheKey },
      select: { claimToken: true, dayStartedAt: true },
    });
    // A stale/timed-out call that lost its race to a newer claim must never
    // delete the newer lease or refund the newer claim's slot.
    if (!lease || lease.claimToken !== claimToken) {
      return { count: 0 };
    }

    const deleted = await tx.exampleGenerationLease.deleteMany({ where: { ...cacheKey, claimToken } });

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
    await tx.exampleGenerationQuota.updateMany({
      where: { userId, dayStartedAt: lease.dayStartedAt, dailyRequestCount: { gt: 0 } },
      data: { dailyRequestCount: { decrement: 1 } },
    });

    return deleted;
  });
}
