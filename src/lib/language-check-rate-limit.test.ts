import { beforeEach, describe, expect, it } from "vitest";
import { isLanguageCheckRateLimited, resetLanguageCheckRateLimitForTests } from "@/lib/language-check-rate-limit";

const USER_A = "cuid_user_a";
const USER_B = "cuid_user_b";

describe("isLanguageCheckRateLimited", () => {
  beforeEach(() => {
    resetLanguageCheckRateLimitForTests();
  });

  it("allows requests under the per-minute ceiling", () => {
    for (let i = 0; i < 40; i++) {
      expect(isLanguageCheckRateLimited(USER_A, 0)).toBe(false);
    }
  });

  it("blocks the request once the ceiling is exceeded within the window", () => {
    for (let i = 0; i < 40; i++) {
      isLanguageCheckRateLimited(USER_A, 0);
    }
    expect(isLanguageCheckRateLimited(USER_A, 0)).toBe(true);
  });

  it("tracks each user independently", () => {
    for (let i = 0; i < 40; i++) {
      isLanguageCheckRateLimited(USER_A, 0);
    }
    expect(isLanguageCheckRateLimited(USER_A, 0)).toBe(true);
    expect(isLanguageCheckRateLimited(USER_B, 0)).toBe(false);
  });

  it("allows requests again once the sliding window has passed", () => {
    for (let i = 0; i < 40; i++) {
      isLanguageCheckRateLimited(USER_A, 0);
    }
    expect(isLanguageCheckRateLimited(USER_A, 0)).toBe(true);

    // 60s window has fully elapsed.
    expect(isLanguageCheckRateLimited(USER_A, 60_001)).toBe(false);
  });
});
