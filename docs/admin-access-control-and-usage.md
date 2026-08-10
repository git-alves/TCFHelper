# Admin access control and usage dashboard

**Problem** — MyTCFLab's owner cannot currently answer basic operating
questions—who is registered, which APIs are being used, or whether one learner
is exhausting a shared provider—without direct database access. Open Clerk
sign-up also needs an owner-controlled admission step because there is no plan
purchase screen.

**Job to be done** — When I operate MyTCFLab, let me see current learner and
provider usage, change one learner's allowance or access, and issue an
invitation without using the database, so I can protect a small private beta
while keeping sign-up simple.

**Success metric** — Today every listed owner job requires database access.
At launch, the owner can find a learner, inspect current usage, change an
effective limit, block/unblock them, and issue a code entirely in the web
dashboard—reducing routine owner database access from that baseline to zero.
Automated acceptance also proves that non-owners receive no admin-route
disclosure, blocked accounts cannot reach protected surfaces, and one code
cannot activate two accounts.

## Goals / non-goals

### Goals

- Give exactly one manually promoted owner an `/admin` area with registered
  user count, searchable/paginated users, per-user detail, current usage, and
  effective quota limits.
- Report translation, model-example, and correction use in aggregate and per
  learner. Add a correction usage counter; `CorrectionLease` is a dedup lock,
  not a counter.
- Let the owner override all three API allowances. Blank inherits the global
  default; `0` intentionally disables that API for one learner.
- Let the owner block/unblock a learner. A blocked learner is quietly returned
  to the public entry point, with no suspension explanation.
- Keep Clerk sign-up open, then require a server-generated, strictly
  single-use code before a non-owner can use learner pages or APIs.
- Keep authorization server-side and per route/page, following the existing
  `getCurrentAppUser()` convention rather than adding authorization middleware.

### Non-goals

- No billing, checkout, Stripe work, plan selection, or payment entitlement.
- No role-management UI, multiple-admin workflow, self-service promotion, or
  ordinary table toggle for ownership.
- No multi-use, expiring, revocable, bulk-imported, emailed, or SMS-delivered
  codes in v1. The owner shares them out of band.
- No historical analytics warehouse, data export, audit log, or provider-cost
  reconciliation. Existing counters are rolling enforcement data.
- No staff access to learner essays or feedback; admin data is limited to
  identity, access state, limits, and usage.
- No global quota editing UI. Global defaults remain code-owned.

## Decision

A local `User.isAdmin` capability identifies one owner. `getCurrentAdminUser()`
builds on the existing app-user resolver; every admin page calls `notFound()`
and every admin API returns generic `404` for anonymous, blocked, non-owner,
or provisioning-failed callers. This matches the established per-route
authorization model and does not reveal a control plane to ordinary learners.

Activation is deliberately separate from `getCurrentAppUser()`. An
authenticated but unactivated learner must reach `/activate` and its
redemption endpoint; the owner must be able to issue codes before becoming a
learner. The owner bypasses activation but never a block. A non-owner is
eligible only after one successful redemption.

Codes are server-generated, human-readable bearer credentials. V1 retains the
code in the owner-only list so it can be copied later; the tradeoff against a
hash-only/reveal-once system is intentional. Codes therefore need at least
80 bits of cryptographic randomness, server-only generation, no logging, and
`private, no-store` responses.

The single-owner requirement overrides the earlier proposed admin-toggle
control. `isAdmin` remains the authorization primitive, but the dashboard
cannot grant, revoke, or block ownership. Initial promotion—and a future
ownership transfer—is a reviewed operator procedure. A PostgreSQL partial
unique index enforces at most one `isAdmin = true` row.

Corrections gain a durable UTC day/month counter. The daily value is enforced;
the month value is reporting-only. A valid, non-duplicate correction reserves
a slot immediately before its provider call and does not refund it after an
attempt, including provider/validation/persistence failure. That conservative
policy mirrors translation and prevents retry storms from bypassing the cost
guard. Invalid input, a cache hit, a saved duplicate, and an active same-key
lease do not consume usage.

## Details

### Data model

| Model / field | Contract |
| --- | --- |
| `User.isAdmin` | Defaults false; at most one true row. The owner is promoted through an explicit operator command after a local `User` exists. |
| `User.isBlocked` | Defaults false. Blocking never deletes a Clerk identity, essays, or quota data. |
| `CorrectionUsage` | One row per learner: `dayStartedAt`/`dailyRequestCount` and `monthStartedAt`/`monthlyRequestCount`, with exact UTC window starts. |
| `UserQuotaOverride` | One row per learner. Nullable fields: translation requests/minute, translation characters/minute, translation characters/month, examples/day, corrections/day. Null = global; zero = disabled. Delete an all-null row. |
| `AccessCode` | Unique server-generated code, optional note, `createdAt`, `redeemedAt`, and unique nullable `redeemedByUserId`. `redeemedAt` is the permanent spent marker, so deleting a redeemer cannot make a code reusable. |

The additive migration silently promotes or activates nobody. The operator
promotes the one owner using a reviewed command that refuses a second owner.
At launch every existing non-owner remains unactivated and needs a code. A
grandfathering campaign is a separate explicit product decision, never a
hidden backfill.

After the intended owner has a provisioned local `User` (by signing in and
opening `/activate` once), run the explicit production command:

```bash
npm run admin:promote -- owner@example.com --apply
```

It serializes promotion and refuses to create a second owner. Promote this
account and issue any needed learner codes before enabling the activation gate.

### Account states and authorization

| State | Learner pages/APIs | Admin pages/APIs |
| --- | --- | --- |
| Anonymous | Pages go to `/login` with a safe local callback; APIs return generic `401`. | Generic `404`. |
| Provisioning failure | Existing unavailable-account recovery. | Generic `404`. |
| Blocked Clerk session | Silent sign-out bridge then `/`; APIs return the same generic `401`. | Generic `404`. |
| Signed in, not activated | Pages go to `/activate`; APIs return the same generic `401` as other unavailable learner sessions and no data. | Owner is activation-exempt. |
| Activated learner | Normal learner access. | Generic `404`. |
| Unblocked owner | Normal admin access and optional learner access without a code. | Normal admin access. |

The blocked bridge is necessary: redirecting a still-signed-in Clerk session
to `/login?callbackUrl=/tasks` can loop back into the protected route. A small
client bridge signs out, then sends the browser to `/` without explaining why.
The public home must resolve application availability rather than raw Clerk
session state, so it does not offer a blocked account a dead-end learner CTA.

`getCurrentAppUser()` stays the blocking boundary. An equivalent
`getCurrentActivatedAppUser()` checks redemption only afterwards; it admits an
unblocked owner without a code and never admits a blocked owner. Do not fold
activation into the base helper.

Activation protects the complete learner application:

- Pages: `/tasks`, `/dashboard`, dashboard history/detail, and direct plus
  intercepted Settings content.
- APIs: translation, topic/recent-topic reads, model examples, corrections,
  progress/history/delete operations, and walkthrough dismissal.
- Exemptions: `/`, `/login`, `/signup`, `/activate`,
  `POST /api/access-codes/redeem`, webhooks, and `/admin/*`.

### Quota and reporting semantics

| API | Initial global default | Override scope |
| --- | --- | --- |
| Translation | 20 requests/minute; 20,000 code points/minute; 100,000 code points/UTC month | All three dimensions |
| Example generation | 1,000 fresh examples/UTC day | Fresh examples/day |
| Correction | 10 provider attempts/UTC day | Corrections/day |

Only fresh provider work counts: accepted translation attempts, uncached example
generation, and a newly claimed correction provider attempt. Example's fixed
cooldown remains a global burst-control, while its durable failed-attempt cap
follows the effective examples/day limit so a lower owner override cannot be
bypassed by repeated provider failures.

Each quota reservation takes a transaction-scoped per-user PostgreSQL advisory
lock, reads that learner's override inside that same transaction, normalizes
stale UTC windows, calculates the next count, rejects before the provider
when over the effective limit, then upserts only an allowed reservation. It
returns a stable `429` code with an exact UTC reset time. Admin override writes
take the same user lock: they affect the next reservation, never reset usage
or retroactively refund work.

Reporting is explicitly **current-window**, not lifetime analytics. Serializers
and aggregates treat stale rows as zero rather than summing a dormant
learner's previous window:

- Translation: current-month code points in aggregates; each learner's detail
  additionally shows current-minute request/code-point use for limit
  diagnosis.
- Examples: current-day fresh provider requests.
- Corrections: current-day and current-month provider attempts.

All labels say “current UTC day/month” rather than imply historical totals.

### Admin surfaces

`/admin` shows registered-user total, blocked count, and the normalized
current-window aggregate for each API. It links to Users and Access codes.

`/admin/users` uses server-side, case-insensitive name/email search and
bounded 25-row pagination. Rows show identity, joined date, activation and
blocked state, owner label, and compact current usage. The detail page avoids
putting five override fields into a dense list.

`/admin/users/[id]` adds current effective limits, nullable override form, and
block/unblock. Blocking self or the owner is rejected. There is no editable
admin switch; the owner label explains that ownership is operationally managed.

`/admin/access-codes` accepts an optional short note, generates/copies a code,
and lists the newest bounded set of issued codes with created/redeemed state
and redeemer email. It is `private, no-store`. The code format uses an
unambiguous uppercase alphabet and at least four groups of four random
characters (80 bits before the fixed `TCF-` prefix).

### API contract

All `/api/admin/*` handlers run the same owner guard and return generic
not-found to non-owners. Owner-visible success/errors are `private, no-store`.

| Endpoint | Contract |
| --- | --- |
| `GET /api/admin/overview` | Registered/blocked counts plus normalized current-window aggregates. |
| `GET /api/admin/users?query=&page=` | Bounded search/page result with normalized usage. |
| `GET /api/admin/users/[id]` | Detail, effective limits, raw nullable overrides; unknown ID is owner-visible 404. |
| `PATCH /api/admin/users/[id]/block` | Strict `{ isBlocked: boolean }`; rejects blocking owner/self. |
| `PATCH /api/admin/users/[id]/quota-overrides` | Strict nullable non-negative integer fields. All-null resets/removes override. |
| `GET /api/admin/access-codes` | Newest bounded issued-code list. |
| `POST /api/admin/access-codes` | Strict optional note; generates a code. No client-selected code. |
| `POST /api/access-codes/redeem` | Authenticated, unblocked learner submits one code. Invalid and already-spent codes share one generic error; repeat success for an already-activated account is idempotent. |

Redemption serializes attempts for one learner and conditionally claims an
unused code in a single transaction. Its predicate requires both
`redeemedByUserId IS NULL` and `redeemedAt IS NULL`; the unique redeemer column
is a second concurrent-submission backstop. No endpoint accepts a browser
user ID to select another learner's data.

### Failure paths

- If access, activation, or quota storage fails, fail closed before a provider
  call or learner data response. Learners get a retryable generic error.
- Invalid/used codes return the same message; a code is never reset when its
  redeemer is deleted.
- A quota-store failure never permits an unmetered provider call. Rendering a
  dashboard never mutates rows merely to normalize stale usage.
- A blocked session is silently ended and returns to `/`; APIs do not disclose
  whether it was blocked, deleted, or simply unsigned.
- A lost code is replaced by issuing another code; V1 has no expiry/revoke or
  other recovery workflow.

### Migration and rollout

The migration is additive, committed, reviewed, and added to
`AUTOMATIC_ADDITIVE_MIGRATIONS`. Extend production table detection where
needed. Each PR runs Prisma generation, lint, type-check, tests, build, and
Prisma engine verification.

1. **Schema and owner foundation** — migration/models, partial single-owner
   index, controlled promotion command, app-user/admin guards, blocking, tests.
2. **Access-code issuance** — admin-only generation/list API and UI. Promote
   the owner and issue current learners' codes before a gate exists.
3. **Activation and redemption** — `/activate`, atomic redemption, complete
   learner gating, sign-up redirect to activation, blocked-session bridge.
4. **User management and quota enforcement** — list/detail/search,
   block/unblock, overrides, correction counter, and all quota readers.
5. **Aggregate overview** — normalized aggregate API/page and admin navigation.

This intentionally moves code issuance ahead of gate enforcement from the
initial stack: a deployed gate must never strand existing learners—or the
owner—without an admission path.

## Alternatives considered

**Make every signed-in Clerk user eligible** — rejected because it leaves the
owner unable to control a free beta once an account exists. Clerk still owns
identity; the local code owns admission.

**Use multi-use/cohort codes** — rejected because a leaked shared code has an
unknown blast radius. Single-use codes make each admission unambiguous.

**Add authorization middleware** — rejected because the application already
keeps page/API guards local, preserving API JSON behavior and one testable
access-control model.

**Expose an admin toggle** — rejected because the product has one owner. A
normal toggle can create two owners or lock the sole recovery path out.

**Explain blocking to the learner** — rejected by product decision. Silent
return to marketing avoids inviting state probing or a support conversation
through this surface.

**Build historical analytics now** — rejected because rolling quota counters
are not immutable events. Truthful current-window reporting meets the
operating need without a second data pipeline.

## Open questions

None for v1. Deferred intentionally: owner transfer/multiple roles,
grandfathering, access-code expiry/revocation/bulk issue, hash-only/reveal-once
codes, and historical analytics.
