-- Purely additive: a null lastSignInAt means no sign-in has been recorded for
-- this account since the column shipped, which is correct for every existing row.
ALTER TABLE "User" ADD COLUMN "lastSignInAt" TIMESTAMP(3);
