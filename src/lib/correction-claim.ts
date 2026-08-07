import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { EssayStatus, TopicSource, type Prisma, type TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CLAIM_TRANSACTION_TIMEOUT_MS = 3_000;
// Gemini correction calls can take up to 45 seconds. Leave room for the
// response to be validated and persisted, while still allowing a learner to
// recover from a server invocation that disappears without cleanup.
const LEASE_DURATION_MS = 75_000;

export type CorrectionTopicContext =
  | { kind: "shared"; id: string }
  | { kind: "custom"; prompt: string };

export interface CorrectionClaimInput {
  userId: string;
  correctionKey: string;
  taskType: TaskType;
  content: string;
  topic: CorrectionTopicContext;
}

interface CorrectionClaimKey extends CorrectionClaimInput {
  correctionKeyHash: string;
}

export type CorrectionClaim =
  | { kind: "existing"; essayId: string; correctionKeyHash: string }
  | { kind: "claimed"; claimToken: string; correctionKeyHash: string }
  | { kind: "inProgress"; retryAt: Date; correctionKeyHash: string };

export type CorrectionClaimCompletion<T> =
  | { kind: "completed"; value: T }
  | { kind: "existing"; essayId: string }
  | { kind: "inProgress"; retryAt: Date }
  | { kind: "lost" };

export function hashCorrectionKey(correctionKey: string) {
  return createHash("sha256").update(correctionKey, "utf8").digest("hex");
}

function makeClaimKey(input: CorrectionClaimInput): CorrectionClaimKey {
  return { ...input, correctionKeyHash: hashCorrectionKey(input.correctionKey) };
}

function lockKey({
  userId,
  correctionKeyHash,
}: Pick<CorrectionClaimKey, "userId" | "correctionKeyHash">) {
  return `correction:${userId}:${correctionKeyHash}`;
}

function legacyCorrectionWhere(input: CorrectionClaimKey): Prisma.EssayWhereInput {
  const base = {
    // A correction-key hash is authoritative once it exists. Only rows from
    // before this additive rollout need the more expensive exact-context
    // fallback below; otherwise two topic identities with an equal prompt
    // could incorrectly collapse into one correction.
    correctionKeyHash: null,
    taskType: input.taskType,
    content: input.content,
  };

  // Older rows have no correctionKeyHash. Match their saved context exactly
  // rather than treating the same text for a different task/topic as a
  // duplicate. New rows use the indexed hash above.
  return input.topic.kind === "shared"
    ? { ...base, topicId: input.topic.id }
    : {
        ...base,
        topic: {
          is: {
            source: TopicSource.USER_SUBMITTED,
            prompt: input.topic.prompt,
          },
        },
      };
}

async function findExistingCorrection(tx: Prisma.TransactionClient, input: CorrectionClaimKey) {
  return tx.essay.findFirst({
    where: {
      userId: input.userId,
      status: EssayStatus.SUBMITTED,
      feedback: { isNot: null },
      OR: [{ correctionKeyHash: input.correctionKeyHash }, legacyCorrectionWhere(input)],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
}

/**
 * Claims a correction before a provider request starts. The transaction-scoped
 * advisory lock serializes same-key requests, while the durable lease keeps
 * that protection after the transaction commits and the provider call runs.
 */
export async function claimCorrection(input: CorrectionClaimInput): Promise<CorrectionClaim> {
  const claimKey = makeClaimKey(input);

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(claimKey)})::bigint)`;

      const existing = await findExistingCorrection(tx, claimKey);
      if (existing) {
        return { kind: "existing", essayId: existing.id, correctionKeyHash: claimKey.correctionKeyHash };
      }

      const now = new Date();
      const lease = await tx.correctionLease.findUnique({
        where: {
          userId_correctionKeyHash: {
            userId: claimKey.userId,
            correctionKeyHash: claimKey.correctionKeyHash,
          },
        },
        select: { expiresAt: true },
      });
      if (lease && lease.expiresAt > now) {
        return { kind: "inProgress", retryAt: lease.expiresAt, correctionKeyHash: claimKey.correctionKeyHash };
      }

      const claimToken = randomUUID();
      await tx.correctionLease.upsert({
        where: {
          userId_correctionKeyHash: {
            userId: claimKey.userId,
            correctionKeyHash: claimKey.correctionKeyHash,
          },
        },
        create: {
          userId: claimKey.userId,
          correctionKeyHash: claimKey.correctionKeyHash,
          claimToken,
          expiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
        },
        update: {
          claimToken,
          expiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
        },
      });

      return { kind: "claimed", claimToken, correctionKeyHash: claimKey.correctionKeyHash };
    },
    { timeout: CLAIM_TRANSACTION_TIMEOUT_MS },
  );
}

/**
 * Persists a completed correction only while the caller still owns its lease.
 * A slow request that outlives its lease cannot overwrite a newer claimant's
 * result or delete their lease.
 */
export async function completeCorrectionClaim<T>(
  input: CorrectionClaimInput & {
    correctionKeyHash: string;
    claimToken: string;
    persist: (tx: Prisma.TransactionClient) => Promise<T>;
  },
): Promise<CorrectionClaimCompletion<T>> {
  return prisma.$transaction(
    async (tx) => {
      const claimKey: CorrectionClaimKey = {
        userId: input.userId,
        correctionKey: input.correctionKey,
        correctionKeyHash: input.correctionKeyHash,
        taskType: input.taskType,
        content: input.content,
        topic: input.topic,
      };
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(claimKey)})::bigint)`;

      const existing = await findExistingCorrection(tx, claimKey);
      if (existing) return { kind: "existing", essayId: existing.id };

      const lease = await tx.correctionLease.findUnique({
        where: {
          userId_correctionKeyHash: {
            userId: claimKey.userId,
            correctionKeyHash: claimKey.correctionKeyHash,
          },
        },
        select: { claimToken: true, expiresAt: true },
      });
      if (!lease || lease.expiresAt <= new Date()) return { kind: "lost" };
      if (lease.claimToken !== input.claimToken) {
        return { kind: "inProgress", retryAt: lease.expiresAt };
      }

      const value = await input.persist(tx);
      await tx.correctionLease.deleteMany({
        where: {
          userId: claimKey.userId,
          correctionKeyHash: claimKey.correctionKeyHash,
          claimToken: input.claimToken,
        },
      });
      return { kind: "completed", value };
    },
    { timeout: CLAIM_TRANSACTION_TIMEOUT_MS },
  );
}

/** Removes only this caller's lease after a failed provider request. */
export async function releaseCorrectionClaim({
  userId,
  correctionKeyHash,
  claimToken,
}: Pick<CorrectionClaimKey, "userId" | "correctionKeyHash"> & { claimToken: string }) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey({ userId, correctionKeyHash })})::bigint)`;
      return tx.correctionLease.deleteMany({
        where: { userId, correctionKeyHash, claimToken },
      });
    },
    { timeout: CLAIM_TRANSACTION_TIMEOUT_MS },
  );
}
