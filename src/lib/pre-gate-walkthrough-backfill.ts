import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

/**
 * Vercel marked GitHub production deployment 5841128918 (PR #74) live at this
 * UTC instant. It is deliberately frozen instead of deriving a cutoff from
 * migration execution time: the old deployment could accept sign-ups while the
 * new build was still in progress.
 */
export const ACCESS_CODE_GATE_LAUNCH_AT = "2026-08-10T22:35:44.000Z";

// This maintenance operation classifies the cohort for the v1 walkthrough.
// Freeze it rather than importing CURRENT_WALKTHROUGH_VERSION so a later tour
// revision cannot silently change a reviewed historical data operation.
export const PRE_GATE_WALKTHROUGH_VERSION = 1;

// Kept separate from the candidate predicate so the reviewed write set is
// auditable: notably, it must never set activationWelcomeShownAt or admission.
export const PRE_GATE_WALKTHROUGH_BACKFILL_DATA = {
  walkthroughCompletedVersion: PRE_GATE_WALKTHROUGH_VERSION,
} as const;

export function isUtcTimeZone(timeZone: string | undefined): boolean {
  // PostgreSQL reports the zero-offset standard zone as GMT on some managed
  // providers. These names are equivalent for TIMESTAMP WITHOUT TIME ZONE
  // comparisons; regional zones are intentionally not accepted.
  return timeZone === "UTC" || timeZone === "Etc/UTC" || timeZone === "GMT" || timeZone === "Etc/GMT";
}

export function preGateWalkthroughBackfillWhere(): Prisma.UserWhereInput {
  return {
    createdAt: { lt: new Date(ACCESS_CODE_GATE_LAUNCH_AT) },
    OR: [
      { walkthroughCompletedVersion: null },
      { walkthroughCompletedVersion: { lt: PRE_GATE_WALKTHROUGH_VERSION } },
    ],
  };
}

/**
 * A stable, non-identifying confirmation value for the exact candidate cohort.
 * It lets the operator prove that the reviewed dry run and the applying run
 * selected the same records without printing learner emails or IDs.
 */
export function preGateWalkthroughCandidateFingerprint(userIds: string[]): string {
  return createHash("sha256")
    .update([...userIds].sort().join("\n"))
    .digest("hex");
}
