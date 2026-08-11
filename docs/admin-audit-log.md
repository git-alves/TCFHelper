# Admin operational and sign-in review log

**Problem** — MyTCFLab's owner can see current rolling usage, but cannot
answer why a learner was denied service or whether a provider/access-code
operation recently failed without inspecting deployment logs. Copying raw
application logs into the dashboard would create a second, unbounded store of
learner content, bearer credentials, provider errors, and client metadata.
The owner also needs a deliberately narrow sign-in review signal for possible
account sharing without turning the product into a security forensics system
or a billing ledger.

**Job to be done** — When I operate MyTCFLab, let me find recent, meaningful
service failures, quota denials, code-redemption outcomes, and recent
sign-in review signals in the owner dashboard, so I can resolve a learner
problem without database or deployment log access and without collecting
secrets or unnecessary personal data.

**Success metric** — At launch, the owner can filter the last 30 days of
safe operational events by date, severity, module, learner, or known event
wording from `/admin/logs`; non-owners cannot discover the surface. Automated
acceptance proves that a raw access code, essay/draft text, upstream error,
full IP address, user agent, Clerk session/client ID, request body, stack
trace, and API key cannot be persisted in an owner-visible event row.

Related owner access, admission, quotas, and usage reporting are specified in
the [admin access-control and usage dashboard](admin-access-control-and-usage.md).

## Goals / non-goals

### Goals

- Give the one local owner a private structured operational ledger with
  controlled coalescing and retention deletion at `/admin/logs` and a
  matching owner-only API. The only allowed row updates are safe coalescing;
  the only allowed deletion is the retention purge.
- Record a deliberately small, closed set of safe provider-failure,
  quota-denial, access-code-outcome, and verified session-created events for
  30 days.
- Let the owner review—not automatically act on—a bounded signal of three
  distinct HMACed IP addresses for the same learner within a rolling ten
  minutes. A review signal is not proof of password sharing.
- Render readable messages from trusted event definitions rather than storing
  a free-form message supplied by a browser, provider, or exception.
- Support server-side UTC date filtering, severity/module filtering, safe
  global search, and classic URL-backed pagination at 20, 50, or 100 rows.
- Enforce retention with a protected daily scheduled purge and make a missed
  purge invisible to dashboard reads until it is caught up.

### Non-goals

- No general audit archive, SIEM, compliance evidence store, data export, or
  historical analytics warehouse.
- No raw access code, code hash derived from an entered code, essay/draft
  text, prompt, provider exception text, request/response body, stack trace,
  API key, full IP address, user agent, device identifier, or session ID.
- No login failure, raw device-change/IP-change history, location, session
  replay tool, or automated account-sharing enforcement. `lastActiveAt`
  remains a presence heartbeat, not a login ledger.
- No AI-token/currency cost estimate, provider price table, or aggregate
  performance tile in v1.
- No database-outage, failed-migration, subscription, or platform-deployment
  event persisted in this database. Platform logs remain the source for those
  failures.
- No backfill of old incidents; rolling quota rows are enforcement state, not
  historical events. No owner deletion/export UI or learner-visible log API.

## Decision

Use an owner-only `AdminEvent` table as a 30-day structured operational
ledger plus a private, relation-free `AuthSecuritySession` companion table for
the HMAC-only inputs required to detect a bounded sign-in pattern. A
server-only TypeScript registry and matching database checks control every
owner-visible value and generate the dashboard text. This is chosen over a raw
`message` or JSON payload because a fixed registry makes it possible to prove
that user content, secrets, and untrusted provider text cannot reach the owner
UI.

The ledger covers only events whose operational meaning is known locally:
provider failures, operation-specific quota denials, access-code redemption
outcomes, and verified Clerk `session.created` events. It does not claim to be
complete security telemetry or a provider-billing record. The owner sees it through the existing per-route
admin guard; pages and APIs return generic `404` to anonymous, blocked,
non-owner, or provisioning-failed callers.

Retention is 30 days in UTC. A protected daily Cron purge performs the real
deletion, while all log reads apply the same cutoff. That combination protects
the data boundary if a scheduled run is temporarily missed, without making a
learner request depend on cleanup.

## Details

### Event record and trusted fields

`AdminEvent` is an additive, deliberately relation-free table. A user,
essay, or access code can be deleted while a short-lived event remains useful;
the event must never change deletion or ownership semantics through a
foreign-key cascade.

| Field | Contract |
| --- | --- |
| `id`, `occurredAt`, `firstOccurredAt` | Opaque event ID, most-recent observation, and first observation for a coalesced event. All timestamps are UTC. |
| `severity` | Closed registry value: `INFO`, `WARN`, or `ERROR`. |
| `module` | Closed registry value: `ESSAY_SERVICE`, `QUOTA_ACCESS`, `AUTH_SECURITY`, or `SYSTEM_INTEGRATION`. `AUTH_SECURITY` has the two limited session-review events below; System & integrations remains reserved. |
| `eventType`, `reasonCode` | Closed, server-owned vocabulary. They are never a raw exception, request value, or browser string. |
| `searchText` | Server-generated search tokens made only from the fixed event label and safe registry fields. It is not a general message or free-form payload. |
| `userId`, `essayId`, `accessCodeId` | Nullable opaque local IDs. `essayId` is set only after an Essay exists; `accessCodeId` is an ID, never `AccessCode.code`. The list may join the user's current email for search/display, but does not snapshot an email into the log. |
| `provider`, `httpStatus`, `quotaWindow`, `usageValue`, `quotaLimit` | Optional, bounded operational facts. `provider`, status, window, and reason must come from the registry; counts are only the operation's safe quota values. |
| `maskedIp`, `browserFamily`, `deviceClass` | Session-created events only: `a.b.c.*`, an IPv6 `/48` prefix, or `Unavailable`; plus closed browser/device families. These never contain a full IP, raw user agent, OS, location, or version. |
| `distinctIpCount`, `securityWindowMinutes` | Review-warning events only: the number of distinct HMACed full addresses in the qualifying window and the fixed `10`-minute window. |
| `occurrenceCount`, `dedupeKey` | Repeated noisy outcomes may coalesce. A server-only SHA-256 digest over trusted safe fields and a UTC time bucket makes a duplicate increment/update one row instead of promising an exact per-attempt history. |

There is no `message` column and no arbitrary JSON column. Database checks
enforce the closed event shape (including opaque IDs, fixed search text,
reason/provider/status/window values, and matching optional fields); the
TypeScript registry is the corresponding writer and display source. The model
uses strings rather than a PostgreSQL enum, but adding an event kind still
requires a reviewed additive check-constraint migration.

`AuthSecuritySession` is not selected by `/admin/logs` or its API. It holds
only the local user CUID, source session timestamp, versioned HMAC of the
Clerk session ID, optional versioned HMAC of a normalized full IP, and an
internal alert-window anchor. It stores no raw IP, user agent, Clerk
session/client ID, copied email, embedded Clerk user, city, country, or raw
payload. The HMAC key is a separate server-only
`SECURITY_TELEMETRY_HMAC_SECRET`, not the Clerk signing secret or cron secret.

### V1 event registry and semantics

| Module | Severity | Event | Safe facts and interpretation |
| --- | --- | --- | --- |
| `ESSAY_SERVICE` | `ERROR` | `CORRECTION_PROVIDER_FAILED` | Local user ID, Gemini/provider name, and a fixed failure class or safe status. A correction normally has no `essayId` yet because an Essay is persisted only after valid provider output. |
| `ESSAY_SERVICE` | `ERROR` | `EXAMPLE_PROVIDER_FAILED` | Local user ID, provider, task/level only when those are registry-safe, and a fixed failure class/status. Generated examples are not Essay records. |
| `ESSAY_SERVICE` | `ERROR` | `TRANSLATION_PROVIDER_FAILED` | Local user ID, selected provider/fallback and a fixed failure class/status. The translated draft never enters the event. |
| `QUOTA_ACCESS` | `WARN` | `CORRECTION_QUOTA_DENIED`, `EXAMPLE_QUOTA_DENIED`, `TRANSLATION_QUOTA_DENIED` | Exact operation, safe denial reason, UTC quota window, effective limit, attempted/current safe unit, and reset boundary when known. A translation/example denial is never labelled “blocked from submitting an essay.” |
| `QUOTA_ACCESS` | `INFO` | `ACCESS_CODE_REDEEMED` | First successful redemption only: local user ID and internal access-code ID. Owner bypasses and an already-activated retry do not create a success event. |
| `QUOTA_ACCESS` | `WARN` | `ACCESS_CODE_REJECTED` | Generic `invalid_or_spent` result for the authenticated local user, coalesced in a short UTC bucket. It stores neither the submitted code nor a code-derived hash and does not promise “attempt #N.” |
| `AUTH_SECURITY` | `INFO` | `AUTH_SESSION_CREATED` | A verified Clerk `session.created` delivery, linked to a local user only when the normal verified identity path succeeds. It shows a masked network and coarse browser/device label. |
| `AUTH_SECURITY` | `WARN` | `AUTH_NETWORK_REVIEW_REQUIRED` | Three or more distinct, non-null HMACed IP addresses within a rolling ten minutes for one learner. It says “Possible concurrent access — review recommended”; it does not claim password sharing. |

The current access-code model deliberately makes missing and spent codes
indistinguishable. Its optional validity period begins at redemption, so an
unredeemed code is not an “expired code.” The log must preserve that product
and anti-oracle behavior.

Provider error labels are classifications such as a timeout, transport
failure, invalid provider response, or a fixed HTTP status—never the upstream
message. A successful fallback is not a provider-failure event merely because
the first translation provider was unavailable.

### Event emission and degraded paths

Event recording is best effort and observational. The first
`ACCESS_CODE_REDEEMED` event is attempted only after a committed first code
claim; owner bypasses and already-activated retries do not produce it. If that
event write fails, the committed redemption remains effective and the writer
emits one safe platform/console failure signal. No event write may turn a
provider response, quota denial, or invalid-code response into a different
learner result, and the writer never recursively tries to log its own failure.

- Provider-failure, quota-denial, and rejected-code events use closed safe
  classifications, never an error object or message.
- Quota events use the decision's exact operation/window/limit snapshot. They
  are not reconstructed from the mutable rolling counter later.
- A database outage or failed migration cannot reliably write an event into
  the same database. Vercel/GitHub/deployment monitoring remains authoritative
  for those paths; v1 makes no durability claim for them.
- Session-created events are different: Clerk's verified webhook is processed
  in one database transaction with its private HMAC session row and visible
  safe event. A write failure returns `500` only to Clerk so it retries; it
  never changes the learner's already-completed sign-in.
- Session source time, not webhook receipt time, is used for the rolling
  window. Deliveries older than the 30-day cutoff, malformed timestamps,
  unlinked identities, and impersonated sessions are acknowledged without a
  telemetry row. A missing or invalid signed IP records `Unavailable` and
  never contributes to a review warning.
- Review alerts are de-duplicated while a per-learner transaction lock is
  held. VPNs, travel, mobile-network changes, IPv6 privacy addresses, and
  shared Wi-Fi can produce false positives, so the signal never auto-blocks,
  signs out, revokes access, or notifies a learner.

Consequently, this ledger aids diagnosis but is not an exact count of all
requests or all platform failures.

### Owner surface, filters, and pagination

`/admin/logs` and `GET /api/admin/logs` use `getCurrentAdminUser()` and
generic `404` behavior consistent with the other admin surfaces. Successful
responses are `private, no-store`. The page has text-bearing severity badges
(`INFO`, `WARN`, `ERROR`) so color is not the only signal.

All filtering and pagination happen server-side. URL state is:

| Parameter | Allowed value / behavior |
| --- | --- |
| `range` | `today`, `last-7-days`, `current-month`, or `custom`; all preset boundaries are UTC. |
| `from`, `to` | Required only for `custom`, parsed as UTC instants, with a half-open `[from, to)` interval. The interval must be positive, no longer than 30 days, and within the retention boundary. |
| `severity` | `all`, `INFO`, `WARN`, or `ERROR`. |
| `module` | `all` or a registered module. The UI labels the implemented categories as AI services, Quotas & access, Authentication, and System & integrations. Authentication filters the limited verified-session entries above. |
| `q` | A bounded normalized query over a local user CUID, current linked email, persisted essay ID, fixed event type/reason/display tokens, and no arbitrary metadata. If its email fragment resolves to more than 100 local users, the page/API explicitly returns “Search is too broad” rather than show partial results. |
| `page` | Positive integer, default `1`. |
| `limit` | Exactly `20`, `50`, or `100`, default `20`. |

`today` starts at the current UTC day; `last-7-days` starts 7 × 24 hours
before the query time; `current-month` starts at the current UTC month. Each
ends at the query time and uses a half-open interval. Results sort
deterministically by `occurredAt DESC, id DESC`; the response includes a
server-side total for classic pagination. Invalid API parameters are rejected
rather than interpreted as an unbounded query. The UI debounces changes to
`q` before replacing its URL state.

“Message keyword” means the fixed, server-rendered event wording and safe
event tokens. An email search resolves the user's current `User.email` and
filters by local `userId`; it intentionally does not preserve a historical
email snapshot. That minimizes duplicate identity data at the cost of showing
the current email after an address change.

### Retention, Cron, and failure handling

A protected daily Vercel Cron endpoint deletes `AdminEvent` and
`AuthSecuritySession` rows with `occurredAt` older than `now - 30 days`. The
endpoint accepts only the deployment's configured Cron secret, runs outside
normal learner requests and migrations, and emits a safe platform log of the
number of rows removed or an execution failure.

Every list query additionally applies `occurredAt >= now - 30 days`. If the
database or Cron is unavailable, the job fails visibly to platform monitoring,
no learner-facing request changes behavior, and the next scheduled successful
run catches up. The dashboard never shows expired rows merely because deletion
is delayed. A missed purge means retention has temporarily failed operationally
and must be investigated; it is not silently treated as a successful cleanup.

The live list uses the timestamp, severity, module, user, and essay indexes
defined with the table. With a maximum 30-day window, `count` plus
`skip`/`take` is sufficient for this v1; cursor pagination and archival search
are not needed.

### Migration, rollout, and rollback

1. Add the relation-free `AdminEvent` table, checks, unique dedupe key, and
   query indexes in one additive Prisma migration. Add that migration to
   `AUTOMATIC_ADDITIVE_MIGRATIONS`; do not backfill or add a foreign key to a
   populated product table.
2. Deploy the closed event registry and safe writer, followed by the limited
   emitters. Test that redaction holds for provider errors, only a first
   redemption attempts a success event, a logging failure preserves the
   learner outcome, and duplicate noisy events coalesce.
3. Deploy `/api/admin/logs` and `/admin/logs` with owner-guard, validation,
   no-store headers, text-visible badges, filters, and pagination tests.
4. For session review, add `session.created` to the existing verified Clerk
   webhook and configure a distinct random `SECURITY_TELEMETRY_HMAC_SECRET`
   (at least 32 bytes) in production. Do not rotate that key during the
   30-day retention window without a dual-read migration plan. Before
   handoff, start a controlled fresh Clerk session (or send a Clerk test
   delivery), wait for webhook delivery, and verify one masked row at
   `/admin/logs?range=last-7-days&module=AUTH_SECURITY&page=1&limit=20`.
   Returning to an already-active browser session is not a fresh session and
   intentionally produces no additional row.
5. Provision the Cron secret and scheduled endpoint, verify a controlled
   retention run in production, and monitor its platform-only failure path.

If the application release is rolled back, leave the additive table and its
rows in place; the next successful compatible release can still read them and
the retention job will delete them on schedule. Do not drop a live event table
as an emergency rollback. Disable its emitters/Cron only through a reviewed
deployment change, then investigate platform logs before deciding whether a
new migration is necessary.

## Alternatives considered

**Persist literal log templates and raw error text** — rejected because an
upstream error or client value can contain sensitive content, credentials, or
learner text. Fixed templates and closed fields preserve useful diagnosis
without creating a free-form data sink.

**Use only Vercel/provider logs** — rejected for operational failures and
denials because the owner needs a quick, learner-correlated dashboard view.
Those logs remain the right source for infrastructure, deployment, and
migration failures that cannot safely or reliably self-record in Postgres.

**Store raw session/IP/device telemetry for account-sharing alerts** —
rejected. The approved implementation uses only verified Clerk session-created
events, short-lived versioned HMACs for comparison, a display mask, closed
coarse labels, and review-only warning copy. It cannot prove password sharing.

**Estimate AI cost from quota counters** — rejected because quota counters are
application enforcement values, not provider billing usage. Accurate cost
would require recorded provider/model/version usage, a maintained pricing
source, and treatment of translation fallback behavior.

## Open questions

None for the approved scope. Any raw or more granular session/device/location
collection, sign-in failure tracking, notification, automatic enforcement,
provider performance/cost telemetry, or platform/migration ingestion requires
a separate privacy and operational decision before implementation.
