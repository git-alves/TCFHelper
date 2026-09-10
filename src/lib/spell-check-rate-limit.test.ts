import { beforeEach, describe, expect, it } from "vitest";
import { isSpellCheckRateLimited, resetSpellCheckRateLimitForTests } from "@/lib/spell-check-rate-limit";

const USER_A = "cuid_user_a";
const USER_B = "cuid_user_b";

describe("isSpellCheckRateLimited", () => {
  beforeEach(resetSpellCheckRateLimitForTests);

  it("allows forty requests per user per minute and blocks the next", () => {
    for (let index = 0; index < 40; index++) expect(isSpellCheckRateLimited(USER_A, 0)).toBe(false);
    expect(isSpellCheckRateLimited(USER_A, 0)).toBe(true);
  });

  it("tracks users separately and releases the sliding window after a minute", () => {
    for (let index = 0; index < 40; index++) isSpellCheckRateLimited(USER_A, 0);
    expect(isSpellCheckRateLimited(USER_B, 0)).toBe(false);
    expect(isSpellCheckRateLimited(USER_A, 60_001)).toBe(false);
  });
});
