# TCF Helper

Writing practice and feedback for the TCF (Test de Connaissance du Français)
exam. Students choose a task, get a matching topic from the current month's
recent-exam source or enter their own prompt, write a response, and receive
structured grammar, vocabulary, word-count, and CEFR-level feedback.

Phase 1 is the core writing loop. Its purpose is to validate feedback quality
before the product invests in retention or monetization features. See the
[Phase 1 validation spec](docs/phase-1-core-writing-loop.md) for the job to
be done, success gate, and deliberately excluded scope. There is no billing
gate yet — every logged-in user can reach `/dashboard`.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Postgres via Prisma 6 (models: `User`, `Subscription`, `Topic`, `Essay`, `Feedback`)
- Auth.js (`next-auth@beta`) with a Credentials (email/password) provider
- Stripe SDK, with a setup script for the product/price and a webhook stub
- Vercel-hosted production builds, triggered from GitHub Actions after CI

## Local setup

1. Copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: a Postgres connection string (local Postgres, Neon,
     Supabase, or Vercel Postgres all work).
   - `AUTH_SECRET`: generate with `openssl rand -base64 32`.
   - `ANTHROPIC_API_KEY`: a Claude API key used to generate writing feedback.
   - `GOOGLE_TRANSLATE_API_KEY`: an API key from a Google Cloud project with
     [Cloud Translation](https://cloud.google.com/translate/docs/setup)
     enabled, used server-side for live draft translation. Cloud Translation
     Basic v2 includes the first 500,000 input characters each month at no
     charge (via a $10 monthly credit shared with Advanced), but still requires
     a Cloud project, billing account, and API key. Restrict the key to the
     Cloud Translation API; see [pricing](https://cloud.google.com/translate/pricing).
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID`: see
     [Stripe setup](#stripe-setup) below. Optional for local dev if you're
     not touching billing code.

2. Install dependencies:

   ```bash
   npm install
   ```

   (`postinstall` runs `prisma generate`; it works even without a `.env`
   file, since generating the client only reads the schema, not the
   database — but real values are needed before anything that talks to
   Postgres.)

3. Apply the database schema:

   ```bash
   npm run db:deploy   # applies committed migrations
   # or, while iterating on the schema:
   npm run db:migrate
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Sign up at `/signup`, which logs you in
   and redirects to `/dashboard`.

## Recent-exam topics

The dashboard has two topic choices: **Get a topic from recent exams** and
**Write or paste my own topic**. The first choice is a server-side integration
with the authorised recent-exam source. It derives the current French
month/year URL, verifies that the page is for that month, and returns only the
literal `Tâche 1`, `Tâche 2`, or `Tâche 3` matching the learner's selected
task. It never accepts a client-supplied source URL or silently falls back to
an older month.

If the current month's page is unavailable or its structure changes, the app
keeps the learner's draft and offers the paste-your-own path instead. Retrieved
topics are saved with immutable provenance so Claude grades against the exact
prompt the learner saw.

## Live translation

Live draft translation sends the learner's French draft from the server to
[Google Translate](https://translate.google.com/) through Cloud Translation
Basic v2 only when the selected application language is English, Spanish, or
Portuguese. It is a writing aid, not part of Claude's correction workflow; a
translation failure never prevents writing or requesting feedback. The key is
kept server-side in `GOOGLE_TRANSLATE_API_KEY` and must not be exposed through
`NEXT_PUBLIC_*` variables.

Displayed translations carry Google's required “Powered by Google Translate”
attribution and make Google's translation disclaimer available in the
dashboard. The first 500,000 translated input characters each month are
covered by Google Cloud's shared monthly credit, rather than being permanently
free, so production should set Cloud Billing budgets and alerts before launch.
See Google's [pricing](https://cloud.google.com/translate/pricing) and
[attribution requirements](https://docs.cloud.google.com/translate/attribution).

Before calling Google, the translation route also reserves a durable allowance
for the signed-in learner in Postgres: at most 20 requests and 20,000 input
Unicode code points per UTC minute, plus 50,000 input code points per UTC
calendar month. Google meters code points (including whitespace), so the
server counts them the same way. A transaction-scoped per-user PostgreSQL lock
serializes concurrent reservations across server instances; a direct caller
cannot race two requests through the same remaining allowance. Rejections use
stable error codes plus `Retry-After` and UTC `resetAt` metadata while the
client continues to show localized recovery copy.

Reservations deliberately account for an accepted request attempt rather than
only a completed Google response. If a client disconnects immediately after
the durable reservation, that learner's allowance remains spent; this avoids a
release racing a newer request for the same learner. The aborted request never
reaches Google, and it cannot spend anyone else's allowance.

## Database

Schema lives in `prisma/schema.prisma`. The initial migration is committed
under `prisma/migrations/`. After changing the schema, run
`npm run db:migrate` to generate a new migration, and commit the generated
SQL.

The Prisma Client uses Prisma's standard `@prisma/client` layout in
`node_modules/.prisma/client`, regenerated by `postinstall` and
`npm run db:generate`. The production build intentionally uses Webpack and
Prisma's official `@prisma/nextjs-monorepo-workaround-plugin`. GitHub CI
builds and verifies the Prisma runtime independently; the production workflow
then uploads source for Vercel to build in its own environment. Vercel runs
`npm run vercel-build`, which generates the Prisma client, applies permitted
production migrations, builds the app, and verifies the RHEL engine before a
successful deployment can be released.

### Production migration policy

The production workflow passes `RUN_PRODUCTION_MIGRATIONS=1` only to Vercel's
remote production build. It does not run `vercel pull`, `vercel build`, or
Prisma against the database in GitHub Actions, so `DATABASE_URL` remains a
Vercel-only sensitive environment variable.

`scripts/deploy-additive-migrations.ts` is intentionally fail-closed:

- A new, empty production database has no Prisma history or application
  tables, so the remote build bootstraps it with the complete committed
  migration history before the app is built and released. An existing schema
  without Prisma history fails closed instead of being guessed at.
- For an existing database, it runs `prisma migrate deploy` only when every
  pending migration is explicitly listed as reviewed and additive in that
  script. This includes `20260731200000_add_translation_quota`, so the quota
  table is in place before the translation route receives traffic.
- A contract/destructive or unclassified migration makes the Vercel build
  fail before release. Apply it through its maintenance runbook instead; only
  add a future migration to the allowlist after reviewing it as additive.

This policy is deliberately stricter than `prisma migrate deploy` alone,
which always applies every pending migration and cannot select just one.

**Upgrading a live deployment past the subscription-identity change:** the
contract migration `20260729150000_require_subscription_id_and_drop_legacy_unique`
is deliberately excluded from the automatic policy. The webhook handler used
to upsert `Subscription` rows by the (then-unique) `stripeCustomerId` column;
it now upserts by `stripeSubscriptionId` and requires the `StripeEvent` table
to exist. Those two things can't both be true at once for the same running
handler — `prisma migrate deploy` applies every pending migration in one shot
(there's no flag to stop partway), and even if there were, the new handler
upserting by `stripeSubscriptionId` while the old `stripeCustomerId` unique
index is still around would still throw `P2002` the moment a returning
customer starts a second subscription. So this isn't safe to roll out
gradually — take a short webhook maintenance window instead:

1. **Don't disable the endpoint/destination in the Stripe dashboard** —
   [Stripe does not queue or backfill events generated while a
   destination is disabled](https://docs.stripe.com/workbench/event-destinations),
   so any subscription change during that window would be lost for good.
   Instead, make delivery transiently *fail* while leaving the
   destination enabled: `/api/webhooks/stripe` specifically must return a
   non-2xx status (`503`) or be genuinely unreachable/time out — a generic
   maintenance page that answers `200` for everything (including the
   webhook path) counts as a successful delivery to Stripe, and that
   event is gone for good. In live mode, Stripe retries a failed delivery
   with backoff for up to 3 days; test mode's retry window is much
   shorter, so don't rely on it there.
2. Wait for in-flight requests to the old handler to drain, then run
   `npm run db:deploy` — with nothing processing events, it's safe to
   apply both `20260729140000_add_stripe_event_and_customer_index` and
   `20260729150000_require_subscription_id_and_drop_legacy_unique`
   together. If the second migration's preflight check fails (a row has a
   NULL `stripeSubscriptionId`), fix or remove that row, then run
   `npx prisma migrate resolve --rolled-back 20260729150000_require_subscription_id_and_drop_legacy_unique`
   before retrying `db:deploy` — Prisma records the migration as failed
   and won't reapply it until you do.
3. Deploy the new app code, restoring a working endpoint.
4. Stripe redelivers failed attempts automatically over its retry window,
   and the `StripeEvent` dedupe plus per-subscription advisory lock make
   replays and out-of-order arrivals safe. As a safety net, once the
   retry window has passed, check the endpoint's delivery logs in the
   Stripe dashboard for anything that exhausted its retries (an outage
   longer than the live-mode ~3-day retry window would do it) and
   manually redeliver each with
   `stripe events resend <event_id> --webhook-endpoint=<endpoint_id>`
   (Stripe CLI) or the dashboard's per-event **Resend** action.

If this is your first deploy (nothing is live yet), skip all of this. The
Vercel production build bootstraps the empty database before any code goes
live; do not add the production `DATABASE_URL` to GitHub merely to run a
manual migration there.

## Auth

`src/auth.ts` configures Auth.js with a Credentials provider backed by
`prisma.user` (bcrypt-hashed passwords, JWT sessions). `src/proxy.ts`
redirects unauthenticated requests to `/dashboard/*` to `/login`; the
dashboard page also checks the session server-side as defense in depth.

There's no email verification, password reset, or OAuth provider yet —
just enough to unblock building the writing tool behind a logged-in
session.

## Stripe setup

1. Set `STRIPE_SECRET_KEY` in `.env` (use a test-mode key while developing).
2. Create the product and price:

   ```bash
   npm run stripe:setup
   ```

   This creates (or reuses) a "TCF Helper Pro" product and a $15/month
   price, and prints the price ID to save as `STRIPE_PRICE_ID`.
3. Point a webhook endpoint at `/api/webhooks/stripe` (via `stripe listen`
   locally, or a dashboard-configured endpoint in production) and set
   `STRIPE_WEBHOOK_SECRET` to the signing secret it gives you.

A webhook endpoint's payloads are serialized using whatever API version the
endpoint (or your account default) is pinned to in the Stripe dashboard —
that's independent of the `apiVersion` pinned in `src/lib/stripe.ts`, and
Stripe doesn't guarantee delivery order, or that an event is delivered only
once, either. The webhook handler doesn't trust the raw payload for either
reason: on a subscription event it only reads the subscription ID off the
payload and re-fetches that subscription through our pinned SDK client, so
the shape always matches what we coded against. It records the Stripe
event ID in a `StripeEvent` table first (`createMany({ skipDuplicates:
true })`, so a redelivery is a no-op rather than a retried write), then
takes a Postgres advisory lock scoped to that subscription ID for the rest
of the transaction, so concurrent deliveries for the same subscription
can't race — whichever one runs last always writes Stripe's current state,
so delivery order doesn't matter for correctness.

The webhook handler (`src/app/api/webhooks/stripe/route.ts`) verifies the
signature and keeps the `Subscription` table in sync for subscription
lifecycle events, but nothing in the app reads subscription status yet —
there's no checkout flow and no feature gate. That's follow-up work.

## Deploying to Vercel

There are two Vercel-hosted build paths; pick one and do not enable both for
the same production branch.

**Option A — Vercel's Git integration (simplest):** import this repo in the
Vercel dashboard, set the environment variables below on the project, and
push to `main`. Also set `RUN_PRODUCTION_MIGRATIONS=1` for the **Production**
environment only, so previews never touch a database. No GitHub secrets are
needed.

**Option B — `.github/workflows/deploy.yml`:** deploys via the Vercel CLI
on every push to `main`. It uploads source with `vercel deploy --prod` rather
than running `vercel build` or uploading `--prebuilt` output; Vercel therefore
receives and builds the source in its own production environment. The workflow
passes the build-only migration flag itself and never receives `DATABASE_URL`.
It requires these repository secrets:

- `VERCEL_TOKEN` — a personal token from
  [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — from running `vercel link` locally
  once, then reading `.vercel/project.json`

Either way, set these environment variables on the Vercel project (with
`DATABASE_URL` and API credentials marked sensitive):

`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_APP_URL`.

For an existing production database, complete any pending contract/destructive
migration through its explicit maintenance runbook before enabling ordinary
remote deployments. Do not add a production database credential to GitHub to
preserve the old prebuilt deployment path.

`.github/workflows/ci.yml` runs lint, a type check, the test suite
(`npm test`), and a build on every push and pull request, using
placeholder env vars (no real services are contacted at build time).
