import { prisma } from "@/lib/prisma";

// One fixed row for the whole project — the scraper fallback is shared
// infrastructure (a single outbound IP/service), so a run of failures (e.g.
// an upstream block) should pause it for every learner, not just whichever
// learner happened to trip it.
const CIRCUIT_ID = "unofficial-translate-scraper";
const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 10 * 60_000;
const TRANSACTION_TIMEOUT_MS = 3_000;

/** True when the fallback has failed enough recently that it should be
 * skipped entirely rather than attempted and likely fail again. */
export async function isFallbackCircuitOpen(now: Date = new Date()): Promise<boolean> {
  const circuit = await prisma.translationFallbackCircuit.findUnique({
    where: { id: CIRCUIT_ID },
  });

  return circuit?.openUntil !== null && circuit?.openUntil !== undefined && circuit.openUntil > now;
}

export async function recordFallbackSuccess(): Promise<void> {
  await prisma.translationFallbackCircuit.upsert({
    where: { id: CIRCUIT_ID },
    create: { id: CIRCUIT_ID, consecutiveFailures: 0, openUntil: null },
    update: { consecutiveFailures: 0, openUntil: null },
  });
}

export async function recordFallbackFailure(now: Date = new Date()): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Serializes concurrent updates from separate server instances so two
      // requests failing at once cannot both read the same pre-increment
      // count and undercount toward the threshold.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CIRCUIT_ID})::bigint)`;

      const existing = await tx.translationFallbackCircuit.findUnique({ where: { id: CIRCUIT_ID } });
      const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;
      const openUntil =
        consecutiveFailures >= FAILURE_THRESHOLD ? new Date(now.getTime() + OPEN_DURATION_MS) : null;

      await tx.translationFallbackCircuit.upsert({
        where: { id: CIRCUIT_ID },
        create: { id: CIRCUIT_ID, consecutiveFailures, openUntil },
        update: { consecutiveFailures, openUntil },
      });
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}
