import { describe, expect, it } from "vitest";

import {
  ACCESS_CODE_GATE_LAUNCH_AT,
  PRE_GATE_WALKTHROUGH_BACKFILL_DATA,
  PRE_GATE_WALKTHROUGH_VERSION,
  isUtcTimeZone,
  preGateWalkthroughBackfillWhere,
  preGateWalkthroughCandidateFingerprint,
} from "./pre-gate-walkthrough-backfill";

describe("pre-gate walkthrough backfill", () => {
  it("uses the verified access-code gate launch rather than migration execution time", () => {
    expect(ACCESS_CODE_GATE_LAUNCH_AT).toBe("2026-08-10T22:35:44.000Z");
    expect(PRE_GATE_WALKTHROUGH_VERSION).toBe(1);
    expect(PRE_GATE_WALKTHROUGH_BACKFILL_DATA).toEqual({ walkthroughCompletedVersion: 1 });
  });

  it("selects only pre-gate learners who are still below the v1 walkthrough", () => {
    expect(preGateWalkthroughBackfillWhere()).toEqual({
      createdAt: { lt: new Date("2026-08-10T22:35:44.000Z") },
      OR: [
        { walkthroughCompletedVersion: null },
        { walkthroughCompletedVersion: { lt: 1 } },
      ],
    });
  });

  it("creates a stable candidate confirmation value without exposing identifiers", () => {
    expect(preGateWalkthroughCandidateFingerprint(["user_b", "user_a"])).toBe(
      preGateWalkthroughCandidateFingerprint(["user_a", "user_b"]),
    );
    expect(preGateWalkthroughCandidateFingerprint(["user_a"])).not.toBe(
      preGateWalkthroughCandidateFingerprint(["user_b"]),
    );
  });

  it("accepts only the UTC database timestamp convention used by the approved cutoff", () => {
    expect(isUtcTimeZone("UTC")).toBe(true);
    expect(isUtcTimeZone("Etc/UTC")).toBe(true);
    expect(isUtcTimeZone("America/New_York")).toBe(false);
    expect(isUtcTimeZone(undefined)).toBe(false);
  });
});
