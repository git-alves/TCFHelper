# Correction History

**Problem** — A successful correction is useful after the learner leaves the writing workspace, but reopening a live editor modal would mix saved work with an unrelated unsaved draft. Learners also need a reliable way to revisit a previous correction instead of submitting identical text again. Every saved record must remain private to the learner who created it.

## Goals / Non-goals

### Goals

- Put a small **Recent corrections** list directly below the CEFR trend on the authenticated Dashboard, where learners already go to review progress.
- Provide a dedicated `/dashboard/history` page and an owner-scoped archived correction URL for each saved submission.
- Reuse only the immutable `Essay` and `Feedback` data that was successfully persisted; never request another model correction just to show history.
- Make old, incomplete records useful without fabricating new score, model-text, or rationale fields.
- Prevent duplicate paid/provider correction requests for the same learner, task, topic, and submitted text.

### Non-goals

- No public sharing links, cross-user lookup, staff access, or client-supplied user IDs.
- No claim that a historical CEFR estimate or mytcflab learning indicator is an official TCF result.
- No migration that rewrites historical feedback JSON merely to match the latest modal schema.
- No client-side or cross-user history query. The initial server-rendered route lists the learner’s saved corrections; cursor pagination should be introduced before account history becomes large.

## Decision

History lives on the Dashboard rather than in the writing modal. The Dashboard has no unsaved-draft/discard semantics, and a normal history URL is bookmarkable, reloadable, and easy to protect with the logged-in user’s identity.

Every history read scopes the `Essay` query to `userId` before selecting any data. The short dashboard list deliberately excludes original text and feedback JSON. The detail route can select those fields only after the owner scope, validates the split JSON/column feedback record with Zod, and shows an honest limited view if a legacy correction predates the richer contract.

The correction request itself uses a normalized task/topic/text key. The client disables a duplicate request in the current workspace; the server-side lease and completed-record lookup remain authoritative across reloads, tabs, and lost HTTP responses.

## Details

### Surfaces

| Surface | Data shown | Action |
| --- | --- | --- |
| Dashboard | Five newest corrections: task, assessed date, topic title when available, word-count status, and estimated CEFR | Open the archived correction or the complete history page |
| `/dashboard/history` | The learner’s saved corrections, newest first | Open a specific archived correction |
| `/dashboard/history/[essayId]` | Saved original text plus the validated correction-review presentation; older incomplete records show only the fields actually retained | Return to history |

### Ownership and stored feedback

The list query uses `where: { userId, status: SUBMITTED, feedback: { is: {} } }`. The detail query uses `findFirst` with both `id` and `userId`; unknown and foreign IDs return the same not-found result. A history list never accepts a user ID from the browser.

`Feedback` splits its data across typed columns and JSON. New corrections also store the selected feedback locale, so an archived review can say which language generated prose uses after a learner changes their interface language. The history adapter combines `level`, `summary`, `meetsWordCount`, `grammarNotes`, and `suggestions`, then parses them through the live feedback schema. If parsing fails—for example because an old row has no `modelVersion`, scores, CEFR rationale, or stored locale—the detail presents its existing summary/level only and says that detailed review is unavailable. It does not cast JSON or derive missing values.

### Duplicate-correction policy

The correction identity normalizes CRLF/LF, Unicode composition, and outer whitespace, but preserves internal whitespace and paragraph structure. It includes the task and grading context: a shared topic ID or a normalized custom prompt. The selected interface language is intentionally excluded: changing application chrome should not spend a new assessment.

The server hashes the key and holds a short owner-scoped lease before calling a provider. A completed matching essay returns a typed duplicate response; an active matching lease returns a retryable in-progress response. A failed provider call releases only its own lease. During rollout, legacy essays without a stored key are matched by the exact user-scoped task/content/context instead of being silently ignored.

The `20260807120000_add_correction_claims` migration is additive, but it is deliberately not in the automatic production-migration allowlist. Apply it only after an explicit production maintenance decision; until then, do not deploy code that depends on its new columns and lease table.

### Failure and degraded paths

- An unauthenticated history request redirects to sign-in; provisioning failures use the existing account-unavailable state.
- A duplicate correction never calls Gemini again. The workspace tells the learner to edit the response/topic or use history.
- If the claim store fails, correction fails closed before a provider call rather than risking an unprotected duplicate charge.
- If a persisted record lacks new modal fields, the archived view is limited but remains owner-visible and truthful.

## Alternatives considered

**Put history inside the live correction modal** — rejected because the modal is tied to a current draft, loading/retry state, and focus restoration. It would make an archived correction look like feedback for an editor that may contain unrelated unsaved work.

**Use only a client-side duplicate flag** — rejected because it disappears on reload and cannot protect a second tab or a response that persisted on the server after the network connection failed.

**Cast `grammarNotes` directly to the current feedback type** — rejected because saved historical JSON is not automatically upgraded when the output schema evolves, and a cast would turn absent fields into misleading UI.

## Open questions

- Should the first scalable history upgrade prioritize cursor pagination, search, or filters by Tâche/estimated CEFR?
- What retention/deletion controls should learners receive once correction history becomes a long-term account record?
