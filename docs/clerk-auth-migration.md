# Clerk authentication migration

**Problem** — TCF Helper currently owns email/password authentication through
Auth.js and bcrypt. That leaves Google sign-in unavailable and makes the app
responsible for credential handling, reset flows, and identity-provider
maintenance. Replacing that layer must not detach existing learners from their
essays, translation quotas, or Stripe subscriptions.

**Goals / Non-goals**

- Use Clerk for email/password and Google sign-in while keeping `/login` and
  `/signup` as the product URLs.
- Preserve the current Prisma `User.id` (a CUID) as the ownership key for
  essays, subscriptions, quotas, and Stripe metadata.
- Import existing bcrypt credentials into Clerk so learners can sign in again
  without resetting their password, then optionally use Google through the
  same Clerk account.
- Keep server-side routes fail-closed if a Clerk identity cannot be resolved
  to a local learner.
- Do not rewrite existing foreign keys, build a bespoke OAuth UI, or delete
  local users in response to a Clerk deletion event in this migration.

**Decision** — Clerk is the authentication system of record. The application
keeps its local CUID user identity and adds a nullable, unique
`User.clerkUserId` mapping. Each authenticated server request resolves
Clerk's `user_…` subject to that mapping before reading or writing application
data. This is safer than replacing every foreign key and Stripe metadata, and
safer than silently linking a legacy local account based only on a matching
email address.

**Details**

1. The additive database migration adds `User.clerkUserId`, makes
   `passwordHash` nullable for Clerk-created users, and records processed
   Clerk webhook event IDs. Existing CUIDs and all dependent rows remain
   unchanged.
2. Before production cutover, apply the additive database migration (for
   example, `RUN_PRODUCTION_MIGRATIONS=1 npm run db:deploy:additive` from a
   controlled machine with the production `DATABASE_URL`), then run
   `npm run clerk:import` for its local eligibility dry run. After resolving
   every conflict and temporarily freezing legacy Auth.js signup, run
   `npm run clerk:import -- --apply --allow-auto-verified-email-import` in a
   controlled environment that has database access and `CLERK_SECRET_KEY`.
   The extra flag is intentional: Clerk auto-verifies an imported email whereas
   the legacy app did not verify signups, so an operator must explicitly accept
   that account-linking policy. The script imports each legacy bcrypt digest
   into Clerk with the local CUID as Clerk's `externalId`, then records the
   returned Clerk ID locally. It never prints password hashes and exits non-zero
   if any local user remains unmapped. Existing Auth.js sessions do not
   transfer, so learners sign in once through Clerk after cutover.
3. The server resolver first looks up `clerkUserId`. On its first request it
   accepts an existing local user only when Clerk's server-controlled
   `externalId` matches that local CUID. A Clerk user without an external ID
   can create a new local user only with a verified primary email. A matching
   legacy email without a matching external ID is rejected rather than
   claimed.
4. Clerk middleware makes the authenticated request context available across
   pages and API routes. Dashboard and API handlers keep their own guards:
   pages redirect to sign-in, while JSON endpoints continue to return `401`
   for an anonymous request.
5. Clerk's prebuilt, self-hosted `<SignIn />` and `<SignUp />` components
   handle password, verification, reset, and Google connection UI. They use
   the product's language picker through `@clerk/localizations`. Google is
   enabled in the Clerk dashboard; its production OAuth client credentials
   belong in Clerk and Google Cloud, never in this repository or Vercel
   client variables.
6. The `user.created` and `user.updated` webhook path is idempotent, but
   first-request provisioning remains necessary because webhooks are
   eventually consistent. A `user.deleted` event deliberately does not
   cascade-delete local learning records; retention/deletion policy is a
   separate decision.

**Production order** — create the production Clerk webhook at
`https://<app-domain>/api/webhooks/clerk` for `user.created` and `user.updated`,
apply the additive migration, configure Google, run and review the local dry
run, freeze legacy signup, perform the guarded import until the unmapped count
is zero, then deploy the Clerk build and validate both a legacy password and a
Google sign-in. This order prevents an Auth.js signup from racing past the
import cursor and being stranded without a Clerk mapping.

**Failure modes** — Missing/invalid Clerk configuration prevents the auth UI
from initializing and must fail deployment configuration checks. A valid
Clerk session with no valid local mapping yields an unavailable account state
rather than using a Clerk subject as a foreign key. Migration/import failures
leave the old local record intact; retry the import after fixing only the
failed account. A failed webhook is safe to redeliver because event IDs are
recorded durably.

**Alternatives considered**

Replacing every local user ID with Clerk's subject would require a multi-table
foreign-key and Stripe-metadata rewrite, with avoidable risk to learner
history. Auto-linking by email would make migration mistakes or account-link
edge cases capable of attaching a Clerk identity to a legacy record, so it is
rejected. Keeping Auth.js only for old passwords would preserve a second
authentication system and undermine the cutover; Clerk imports bcrypt hashes
instead.

**Open questions** — Legacy password hashes remain temporarily only to allow
recovery from an import problem. Once the production import and sign-in
verification window is complete, remove that column through a separately
reviewed maintenance migration.
