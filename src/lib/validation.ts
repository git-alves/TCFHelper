import { truncates } from "bcryptjs";
import { z } from "zod";

// bcrypt only hashes the first 72 bytes of a password; anything past that
// is silently ignored, so two different passwords sharing that 72-byte
// prefix would hash identically. Reject before it becomes a footgun.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((password) => !truncates(password), {
    message: "Password is too long",
  });

// For login, not signup: an account created before passwordSchema existed
// may have a password well past 72 bytes that bcrypt already truncated
// when hashing, and bcrypt.compare will still match it correctly today.
// Any fixed max length risks rejecting some such password before
// bcrypt.compare gets a chance — there's no length we can prove is safe.
// This bound is deliberately huge, so it can't plausibly reject a
// real-world password; its only job is to stop a pathological payload
// (megabytes of input) from reaching bcrypt.compare/the DB lookup.
export const loginPasswordSchema = z.string().min(8).max(10_000);
