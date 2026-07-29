import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

const { authorizeCredentials } = await import("./authorize-credentials");

beforeEach(() => {
  findUniqueMock.mockReset();
});

describe("authorizeCredentials", () => {
  it("authenticates a matching email and password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      email: "a@example.com",
      name: "A",
      passwordHash,
    });

    const result = await authorizeCredentials({
      email: "a@example.com",
      password: "correct-password",
    });

    expect(result).toEqual({ id: "user_1", email: "a@example.com", name: "A" });
  });

  it("rejects the wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      email: "a@example.com",
      name: "A",
      passwordHash,
    });

    const result = await authorizeCredentials({
      email: "a@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  it("rejects an unknown email, but still runs bcrypt.compare against a dummy hash", async () => {
    // Regression: returning early for an unknown email — skipping
    // bcrypt.compare entirely — makes login response time a timing oracle
    // that reveals which emails have an account. It must always compare
    // against something.
    findUniqueMock.mockResolvedValue(null);
    const compareSpy = vi.spyOn(bcrypt, "compare");

    const result = await authorizeCredentials({
      email: "nobody@example.com",
      password: "whatever123",
    });

    expect(result).toBeNull();
    expect(compareSpy).toHaveBeenCalledTimes(1);
  });

  it("authenticates a legacy account whose >72-byte password bcrypt already truncated", async () => {
    // Regression: this password would fail signup's passwordSchema today,
    // but an account created before that check existed could have exactly
    // this shape, and bcrypt.compare still matches its (already-truncated)
    // hash. Login must not reject it before reaching bcrypt.compare.
    const longLegacyPassword = "a".repeat(600);
    const passwordHash = await bcrypt.hash(longLegacyPassword, 4);
    findUniqueMock.mockResolvedValue({
      id: "user_2",
      email: "legacy@example.com",
      name: null,
      passwordHash,
    });

    const result = await authorizeCredentials({
      email: "legacy@example.com",
      password: longLegacyPassword,
    });

    expect(result).toEqual({ id: "user_2", email: "legacy@example.com", name: null });
  });

  it("rejects malformed credentials without querying the database", async () => {
    const result = await authorizeCredentials({ email: "not-an-email", password: "short" });

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
