# MyTCFLab

Writing practice and feedback for the TCF (Test de Connaissance du Français)
exam. Students choose a task, get a matching topic from the current month's
recent-exam source or enter their own prompt, write a response, and receive
structured grammar, vocabulary, word-count, and CEFR-level feedback.

Phase 1 is the core writing loop. Its purpose is to validate feedback quality
before the product invests in retention or monetization features. See the
[Phase 1 validation spec](docs/phase-1-core-writing-loop.md) for the job to
be done, success gate, and deliberately excluded scope. There is no billing
or plan-purchase flow: Clerk sign-up remains open, while a learner redeems an
owner-issued access code before reaching the app. The owner controls admission
and current usage through the
[admin access-control specification](docs/admin-access-control-and-usage.md)
and can review the bounded [admin operational log](docs/admin-audit-log.md).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Postgres via Prisma 6 (models: `User`, `Subscription`, `Topic`, `Essay`, `Feedback`)
- Clerk for email/password authentication and Google sign-in
- Stripe SDK, with a setup script for the product/price and a webhook stub
- Vercel-hosted production builds, triggered from GitHub Actions after CI

## Local setup

1. Copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: a Postgres connection string (local Postgres, Neon,
     Supabase, or Vercel Postgres all work).
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: retrieve
     these from the Clerk dashboard. The publishable key is browser-safe; the
     secret key stays server-only.
   - `CLERK_WEBHOOK_SIGNING_SECRET`: the Svix signing secret for the Clerk
     webhook endpoint. Required once the Clerk user-sync webhook is enabled.
   - `SECURITY_TELEMETRY_HMAC_SECRET`: a separate server-only random value of
     at least 32 bytes. It makes the 30-day sign-in review fingerprints
     non-reversible; never reuse the Clerk signing secret or expose it to the
     browser.
   - `GEMINI_API_KEY`: a Gemini API key used for writing corrections and
     model answers.
   - `GEMINI_CORRECTION_MODEL` (optional): the model used only for writing
     correction, kept separate from `GEMINI_MODEL` so grading doesn't
     implicitly share the model-answer generator's model.
     Defaults to a free-tier Flash-Lite model; check
     [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)
     for the current lineup, since free-tier names are retired over time.
   - `DEEPL_API_KEY` (optional): a [DeepL API Free](https://www.deepl.com/pro-api)
     key (ends in `:fx`), used server-side for live draft translation. Free
     covers 500,000 characters/month, no billing details required. If unset,
     or once that quota is reached, translation falls back to an unofficial
     method — see [Live translation](#live-translation).
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

   Visit `http://localhost:3000`. Sign up at `/signup`, which uses Clerk's
   prebuilt flow and then sends non-owner learners to `/activate`. Redeem an
   owner-issued single-use access code there before reaching `/tasks` or the
   `/dashboard` progress/history views. Enable Google in the Clerk dashboard
   to show it as a sign-in option.

## Recent-exam topics

The Tasks screen (`/tasks`) has two topic choices: **Get a topic from recent exams** and
**Write or paste my own topic**. The first choice is a server-side integration
with the authorised recent-exam source. It derives the current French
month/year URL, verifies that the page is for that month, and returns only the
literal `Tâche 1`, `Tâche 2`, or `Tâche 3` matching the learner's selected
task. It never accepts a client-supplied source URL.

The upstream site lags a few days into each month before publishing that
month's page. If the current month's page has not been published yet (an
empty result from its WordPress API), the app retries once against last
month's already-published page instead of failing outright; the displayed
source label always reflects whichever month was actually used. Any other
failure (the source is unreachable, or its structure changed) does not fall
back — the app keeps the learner's draft and offers the paste-your-own path
instead. Retrieved topics are saved with immutable provenance so Gemini grades
against the exact prompt the learner saw.

If neither the current nor the prior month is published, `/api/topics/recent`
returns a stable `RECENT_EXAM_NOT_PUBLISHED` code (HTTP 404) instead of the
generic unavailable response used for an actual outage or a changed page
structure, and the UI shows a matching “not published yet” message rather than
its generic retry copy.

## Seeded topics

`npm run db:seed` loads a starter bank of original topics into `Topic`
(`OFFICIAL_EXAM` source) — 11 per task, format-matched to the real exam
structure (Task 3's are a title plus two contrasting `Document 1` /
`Document 2` paragraphs) but not copied from any real exam.

The Tasks screen keeps its recent-exam and custom-topic choices. Once a topic is
selected, learners can generate a B2, C1, or C2 French model answer directly
into the editor. The app caches answers privately per learner/topic/level and
limits fresh generations per day. Gemini generates new examples.

## Live translation

Live draft translation sends the learner's French draft from the server to
[DeepL](https://www.deepl.com/) via the API Free plan only when the selected
application language is English, Spanish, or Portuguese. It is a writing aid,
not part of Gemini's correction workflow; a translation failure never prevents
writing or requesting feedback. The key is kept server-side in
`DEEPL_API_KEY` and must not be exposed through `NEXT_PUBLIC_*` variables.

Before calling DeepL, the translation route also reserves a durable allowance
for the signed-in learner in Postgres: at most 20 requests and 20,000 input
Unicode code points per UTC minute, plus 100,000 input code points per UTC
calendar month. DeepL meters code points (including whitespace), so the server
counts them the same way. A transaction-scoped per-user PostgreSQL lock
serializes concurrent reservations across server instances; a direct caller
cannot race two requests through the same remaining allowance. Rejections use
stable error codes plus `Retry-After` and UTC `resetAt` metadata while the
client continues to show localized recovery copy. DeepL's API Free plan does
not require end-user attribution, so the UI shows only a plain "Translations
powered by DeepL" credit, not a mandated badge.

### Unofficial scraper fallback

`DEEPL_API_KEY` is optional. If it is unset, or DeepL responds with its
documented HTTP 456 (the account's 500,000-character monthly quota has been
reached), the route falls back to
[`@vitalets/google-translate-api`](https://www.npmjs.com/package/@vitalets/google-translate-api)
(`src/lib/unofficial-translate.ts`), which calls Google Translate's public web
endpoint directly with no API key and no billing. Any other DeepL failure
(invalid key, malformed response, network error) still fails closed with the
existing "temporarily unavailable" response — only quota exhaustion (or a
missing key) reaches the fallback.

This is a deliberate stopgap, not a second production-grade provider:

- It scrapes the same web endpoint `translate.google.com` itself uses, which
  is against Google's Translate terms of service, has no SLA, and can be
  rate-limited, IP-blocked, or broken by an upstream change with no notice.
- A durable, project-wide circuit breaker (`src/lib/translation-fallback-circuit.ts`,
  the `TranslationFallbackCircuit` table) tracks consecutive fallback
  failures across every server instance. After 5 in a row it stops attempting
  the fallback for 10 minutes and returns `TRANSLATION_FALLBACK_UNAVAILABLE`
  instead, so a blocked or broken endpoint isn't hammered by every learner's
  request.
- The learner-facing UI shows a distinct disclosure whenever a translation was
  produced this way (`copy.workspace.translation.unofficialFallbackNotice`),
  rather than presenting it as an ordinary DeepL result.
- The learner-facing per-user quota above still applies to fallback requests,
  since they carry the same abuse risk against the server's own IP.

Set `DEEPL_API_KEY` as soon as it's available; treat the scraper purely as
what keeps translation working before the key exists or after the free quota
runs out for the month, not as a long-term replacement for it.

Reservations deliberately account for an accepted request attempt rather than
only a completed provider response. If a client disconnects immediately after
the durable reservation, that learner's allowance remains spent; this avoids a
release racing a newer request for the same learner. The aborted request never
reaches DeepL or the fallback, and it cannot spend anyone else's allowance.

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

### Starter-topic bank rollout

The managed OFFICIAL_EXAM starter-topic bank (`src/lib/starter-topics.ts`) is
never mutated in place when a prompt is corrected: `syncSeedTopics`
(`src/lib/seed-topic-sync.ts`) retires the existing row (sets `retiredAt`,
leaves its `id`/`source`/`prompt` untouched) and creates a new one, so an
essay that already references the old row by id keeps its original topic
text and id. This preserves *what was assigned*, not the rubric version it
is graded under: correction selects a Tâche's rubric solely by `taskType`
(`essay-correction-prompt.ts`), not by topic row, so an essay against a
retired, pre-correction-format topic (e.g. an old opinion-style Tâche 2
prompt) is still graded by the current rubric. Whether to version the
rubric per topic is an open product decision, not something `retiredAt`
attempts to solve.

That sync deliberately does **not** run inside `vercel-build`, or as any
step tied to a specific deploy or CI run. `vercel-build` runs entirely
before Vercel promotes the new build to production traffic; a row retired
from in there would be invisible to the *new* deployment's picker (which
filters on `retiredAt: null`) while the *previous* deployment -- still live
and serving requests until cutover completes -- has no such filter and
would list both the retired and replacement topic as duplicates, or
indefinitely if the build then failed. Tying it to a step inside
`.github/workflows/deploy.yml` would also only cover one of the two deploy
paths above (Option A, Vercel's own Git integration, has no GitHub Actions
job to attach a post-deploy step to at all), and would depend on that
specific CI/deploy run actually being the one whose commit ends up live --
GitHub does not guarantee two triggered workflow runs finish in the order
they started, so a slower run for an older commit could still retire a row
after a newer commit's picker is already serving traffic.

Instead, `npm run db:seed:deploy` (`scripts/deploy-seed-topics.ts`) is a
deliberate, human-run maintenance step, run once an operator has confirmed
in the Vercel dashboard that the deployment carrying a corrected
starter-topic prompt is actually promoted to production:

```sh
env -i PATH="$PATH" HOME="$HOME" \
  RUN_PRODUCTION_MIGRATIONS=1 VERCEL_ENV=production \
  vercel env run -e production -- npm run db:seed:deploy
```

`vercel env run -e production` injects production environment variables
(including `DATABASE_URL`) directly into the command's process without ever
writing them to disk, unlike `vercel env pull`. The two confirmation env
vars still matter: the script only proceeds with `VERCEL_ENV` explicitly set
to `production` -- required, not merely permitted, since (unlike the
build-time migration scripts) nothing sets `VERCEL_ENV` automatically on an
operator's own machine.

`env -i` (start the child with an empty environment, plus only the names
listed) matters for a sharper reason than tidiness. `vercel env run`
resolves its child process's `DATABASE_URL` as fetched-production values,
overridden by any local `.env*` file's (`.env`/`.env.local` always, plus the
development pair by default or the test pair under `NODE_ENV=test` --
`deploy-seed-topics.ts` refuses to run if it finds any of these, including
an inherited `NODE_ENV`'s own pair, as defense in depth), overridden in turn
by whatever the invoking shell already has exported. Selectively unsetting
known-dangerous names is not enough, though: `NODE_OPTIONS=--require
dotenv/config` (with `DOTENV_CONFIG_PATH` pointed anywhere reachable,
including the committed `.env.example`) or `npm_config_node_options` doing
the same for npm's own child process injects `DATABASE_URL` before any of
this script's code -- including its own file guard -- ever runs, since a
`--require` preload executes before the entry file loads. No check inside
the script can close that; it runs too late by construction. `env -i`
closes it at the source instead, by never letting `NODE_OPTIONS`,
`npm_config_node_options`, or any other environment-influencing variable
reach the child process at all, rather than enumerating the ones already
known to matter. Run the command exactly as documented, from the repository
root: `deploy-seed-topics.ts`'s file guard checks `process.cwd()`, which
only matches what `vercel env run` itself resolves as long as no `--cwd`,
`npm --prefix`, or similar is layered on top. This repo is a single package
with no workspaces, so that divergence isn't a risk today, but it would
become one if this script were ever invoked through such a wrapper. Still
run it from a clean checkout/worktree of the exact commit shown as live in
the Vercel dashboard: a stale checkout's `STARTER_TOPICS` is a separate risk
no environment guard addresses -- it would retire the current, corrected
bank back to whatever an older commit's `STARTER_TOPICS` looked like.
`npm run db:seed` (`scripts/seed-topics.ts`)
remains the fully unguarded local/maintenance entrypoint. Both go through
the same Postgres
advisory lock (`runLockedSeedTopicSync`) as each other and as any concurrent
run of themselves, so re-running the step is always safe -- a run against
already-current prompts is a no-op.

Running it only after confirming cutover, rather than racing it against
cutover, is what avoids the duplicate-listing window above -- and it needs
no scheduler, so it carries none of a periodic cron's own hazards (Vercel
Hobby permits cron only once daily, and a cron cannot be timed to a specific
deploy's cutover in the first place). This does not make a *later* rollback
free: rolling back to a pre-`retiredAt` deployment after this step has run
restores a picker that filters only on `source`, so it lists both the
retired and replacement `OFFICIAL_EXAM` rows as duplicates until you roll
forward again -- the database change itself is not undone by a code
rollback. This is a display-only duplication, not a data-integrity issue:
either duplicate still has its own stable id and unmodified prompt text, so
an essay against either one is still stored and correctable against
exactly the topic text it was written for (subject to the same
taskType-only rubric-selection caveat above, which is unaffected by
rollback either way). It is the same "additive changes are
forward-compatible only, not rollback-compatible" caveat that applies to
this repo's other schema changes -- see "Production migration policy"
above.

The one-time `npm run onboarding:backfill-pre-gate` command is intentionally a
reviewed maintenance operation rather than an automatic deployment migration:
it records only the pre-gate cohort's onboarding version, not access admission.
Run `npm run onboarding:backfill-pre-gate -- --production`, then its
count/fingerprint-confirmed apply step, from a controlled production checkout
before releasing the welcome-routing change; see
[admin access control and usage](docs/admin-access-control-and-usage.md).

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

## Authentication

Clerk owns sign-in, sign-up, password recovery, and Google social sign-in.
The app keeps its self-hosted Clerk pages at `/login` and `/signup`; the
prebuilt components use the currently selected product language where Clerk
provides a localization. Configure Clerk with:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Clerk
  dashboard;
- `CLERK_WEBHOOK_SIGNING_SECRET` for `/api/webhooks/clerk`;
- `SECURITY_TELEMETRY_HMAC_SECRET`, a separate random value of at least 32
  bytes, for short-lived sign-in review fingerprints;
- the four `NEXT_PUBLIC_CLERK_*_URL` / fallback-redirect variables shown in
  `.env.example`.

For development, enable **Google** under Clerk's SSO connections. For
production, configure custom Google OAuth credentials in Clerk, copy Clerk's
exact redirect URI into Google Cloud, and set the Google OAuth consent screen
to **In production**. Those Google credentials belong in Google Cloud and
Clerk, not in this repository or Vercel.

Also create a Clerk Dashboard webhook for
`https://<your-production-domain>/api/webhooks/clerk`, subscribe it to
`user.created`, `user.updated`, and `session.created`, and put its signing
secret in `CLERK_WEBHOOK_SIGNING_SECRET`. The handler verifies each Svix
delivery and does not delete learner data for a Clerk `user.deleted` event.
The `session.created` subscription records only a masked IP address, a closed
coarse browser/device label, and server-only HMAC fingerprints for a 30-day,
owner-only review signal. It never stores a raw IP address, raw user agent,
Clerk session ID, client ID, or location.

After deploying that subscription, start a fresh Clerk session (sign out and
sign in, or use Clerk's test delivery) and confirm a masked row appears under
**Authentication** at `/admin/logs`. Returning to an existing browser session
does not create a second `session.created` event.

### Migrating existing learners

The application identity stays the existing Prisma CUID `User.id`: essays,
subscriptions, translation quotas, and Stripe subscription metadata continue
to reference it. `User.clerkUserId` maps the Clerk subject to that CUID; no
foreign keys are rewritten.

Before production cutover, import existing bcrypt hashes into the Clerk
**production** instance from a controlled machine that can reach the database:

```bash
npm run clerk:import
npm run clerk:import -- --apply --production --allow-auto-verified-email-import
```

The first command is a read-only dry run. The second performs the import after
you have reviewed it and explicitly approved Clerk auto-verifying imported
legacy email addresses. It also requires a Clerk production (`sk_live_*`)
secret key, so a production database cannot accidentally be linked to a
development Clerk instance. The script requires `DATABASE_URL` and
`CLERK_SECRET_KEY` to apply, sends each legacy hash directly to Clerk with the
local CUID as Clerk's `externalId`, records the returned Clerk ID, and never
logs a password digest. It is re-runnable after a partial failure. Do not put
production database credentials or exported hashes in GitHub, chat, or this
repository. Existing Auth.js sessions cannot transfer, so users sign in once
through Clerk after deployment.

Use this order for the production cutover:

1. Apply the additive Clerk database migration from a controlled machine
   before changing the live auth code (for example,
   `RUN_PRODUCTION_MIGRATIONS=1 npm run db:deploy:additive` with the production
   `DATABASE_URL`).
2. Configure the production Clerk instance, Google connection, and the verified
   webhook above. Run the local eligibility dry run and resolve every reported
   duplicate, missing-password, or existing-Clerk conflict.
3. Temporarily freeze legacy Auth.js signups while the import runs. This avoids
   a new local account appearing after the import cursor has passed and becoming
   unmapped at the Clerk cutover.
4. Run the guarded `--apply` command. It exits non-zero unless every local user
   is mapped; verify the final "local users remain unmapped" count is zero. The
   Vercel production build repeats that database check before building, so it
   cannot release the Clerk code while any legacy mapping is missing. It also
   requires production Clerk `sk_live_*` / `pk_live_*` keys and the webhook
   signing secret, rather than a development instance.
5. Deploy this Clerk build, validate a legacy password sign-in and a Google
   sign-in, then re-enable signup through Clerk.

Protected pages and JSON API routes resolve Clerk's user ID to the mapped local
CUID before accessing data. A legacy record is never claimed merely because an
email matches; imported accounts must present the exact Clerk `externalId`.
Clerk `user.created` and `user.updated` webhooks are idempotent, while local
user deletion is deliberately out of scope because it would cascade-delete
learning history and subscriptions.

## Stripe setup

1. Set `STRIPE_SECRET_KEY` in `.env` (use a test-mode key while developing).
2. Create the product and price:

   ```bash
   npm run stripe:setup
   ```

   This creates (or reuses) a "MyTCFLab Pro" product and a $15/month
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
environment only, so previews never touch a database. A production Vercel
build fails closed if this value is missing, preventing the migration and
Clerk cutover checks from being skipped. No GitHub secrets are needed.

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

`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`CLERK_WEBHOOK_SIGNING_SECRET`, `SECURITY_TELEMETRY_HMAC_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`,
`NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`,
`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`, `GEMINI_API_KEY`,
`GEMINI_CORRECTION_MODEL`, `DEEPL_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_APP_URL`,
`CRON_SECRET` (Production scope only -- required for the admin-event
retention cron to authenticate; see `.env.example`).

For an existing production database, complete any pending contract/destructive
migration through its explicit maintenance runbook before enabling ordinary
remote deployments. Do not add a production database credential to GitHub to
preserve the old prebuilt deployment path.

`.github/workflows/ci.yml` runs lint, a type check, the test suite
(`npm test`), and a build on every push and pull request, using
placeholder env vars (no real services are contacted at build time).
