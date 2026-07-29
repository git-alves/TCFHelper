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
