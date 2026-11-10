import { prisma } from "@/lib/prisma";
import { runLockedStarterTopicBankSync } from "@/lib/seed-topic-sync";
import { STARTER_TOPICS, STARTER_TOPIC_BANK_VERSION } from "@/lib/starter-topics";

const RETRY_AFTER_FAILURE_MS = 60_000;

let completed = false;
let inFlight: Promise<void> | undefined;
let retryAfter = 0;

/**
 * Lazy post-promotion reconciliation. Module state makes the hot path a
 * boolean check after success; concurrent cold-start requests share one
 * promise, and the database advisory lock serializes separate instances.
 * A failure is deliberately swallowed after logging so topic serving keeps
 * using the last active rows; the instance retries after a short cooldown.
 */
export async function ensureStarterTopicBankSynced() {
  if (completed || Date.now() < retryAfter) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const result = await runLockedStarterTopicBankSync(prisma, {
        version: STARTER_TOPIC_BANK_VERSION,
        topics: STARTER_TOPICS,
      });
      completed = true;
      console.info("Starter-topic bank synchronization complete.", result);
    } catch (error) {
      retryAfter = Date.now() + RETRY_AFTER_FAILURE_MS;
      console.error("Starter-topic bank synchronization failed; serving the existing topic bank.", error);
    } finally {
      inFlight = undefined;
    }
  })();

  return inFlight;
}

/** Test-only reset for isolated module-state tests. */
export function resetStarterTopicBankSyncForTest() {
  completed = false;
  inFlight = undefined;
  retryAfter = 0;
}
