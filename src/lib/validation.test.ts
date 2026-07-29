import { describe, expect, it } from "vitest";
import { loginPasswordSchema, passwordSchema } from "./validation";

describe("loginPasswordSchema", () => {
  it("accepts a normal password", () => {
    expect(loginPasswordSchema.safeParse("password123").success).toBe(true);
  });

  it("rejects passwords under the minimum length", () => {
    expect(loginPasswordSchema.safeParse("short").success).toBe(false);
  });

  it("accepts a long pre-existing password that predates any signup-time length limit", () => {
    // Regression: signup enforces `passwordSchema`, which rejects any
    // password bcrypt would truncate (i.e. almost anything over 72
    // bytes). But an account created before that check existed may have
    // exactly such a password, already hashed with the truncated value,
    // and bcrypt.compare still matches it correctly today. Login must
    // accept it so bcrypt.compare gets the chance to do that — no fixed
    // max below "huge" can be proven safe for a value with no historical
    // bound.
    const longLegacyPassword = "a".repeat(600);
    expect(passwordSchema.safeParse(longLegacyPassword).success).toBe(false);
    expect(loginPasswordSchema.safeParse(longLegacyPassword).success).toBe(true);
  });

  it("still rejects a pathologically large payload", () => {
    const huge = "a".repeat(50_000);
    expect(loginPasswordSchema.safeParse(huge).success).toBe(false);
  });
});
