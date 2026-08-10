# Phase 1 — Core Writing Loop

**Problem** — TCF written-expression learners need prompt-specific, timely feedback they can use to revise a French response. Today the product can collect a response, but it cannot demonstrate that its AI feedback is accurate enough, actionable enough, or reliable enough to earn investment in the rest of the learning product.

**Job to be done** — When I finish a TCF writing response, help me understand what to correct and what to practise next, in the context of the exact task and word-count requirement, so I can improve before the exam.

## Goals / non-goals

### Goals

- Let an authenticated learner choose Tâche 1, 2, or 3, see its fixed instructions and target word range, get a matching topic from the current month's recent-exam source (or the immediately prior month only when the current page is not yet published) or enter one, and write a response.
- Show the live word count before submission.
- Return one structured AI review containing corrected French text, categorized errors, a word-count check, a CEFR estimate, an overall summary, and actionable suggestions.
- Persist the submitted essay and successful review so a human can audit the feedback during validation.
- Establish whether feedback quality justifies a next phase of learner history, iteration, and monetization.

### Non-goals

- No subscription, checkout, entitlement, or billing gate. Clerk authentication
  exists only to establish learner ownership of persisted work; it is not a
  retention or monetization feature in this phase.
- No feedback history UI, saved drafts, sharing, or notifications. (A learner
  progress/CEFR-trend dashboard was originally excluded here too, but was
  added after Phase 1 shipped — see `/dashboard` and `src/lib/essay-progress.ts`.)
- No claim that a CEFR estimate is an official TCF score or a substitute for a human examiner.
- No automatic topic generation or broad historical search. A recent-exam topic must match the selected task and come from the current month, except for one prior-month retry when the current WordPress page is genuinely not yet published; custom prompts remain learner supplied.
- No translation spending cap of any kind — DeepL API Free has no billing to cap. The systemic risk it carries instead is reliability/availability of its unofficial backup, which the project-wide fallback circuit breaker addresses (see below), not a cost control.
- No guarantee of feedback quality until the validation protocol below has been completed with a live Gemini key.

## Decision

Build the smallest complete loop around one persisted essay and one schema-constrained Gemini response. The interface should expose the context that determines useful feedback (task, prompt, word range, and text) and return feedback in sections rather than a free-form chat answer.

This is preferable to building a dashboard or subscription gate first: the unproven product risk is feedback quality, not account management. Schema-constrained output makes the review display and later human audit predictable; it does not itself establish that the feedback is correct.

## Language and live-translation decision

The selected application language controls visible product-interface copy and the language of AI feedback. It does **not** translate the French exam task, topic, learner draft, or corrected French text: those are learning material and must remain faithful to the source language. Static instructions use their official French TCF terminology; surrounding controls, labels, errors, and status messages use the selected interface language.

Live draft translation is a separate, low-latency aid. It translates French learner text into the selected non-French language through DeepL's API Free plan; static UI strings come from a maintained local dictionary rather than consuming translation quota at runtime. Gemini remains responsible for structured correction because translation alone cannot produce the error, word-count, CEFR, and suggestion contract. The DeepL credential stays server-only. DeepL's Free plan does not require end-user attribution, so the UI shows a plain, unbadged "Translations powered by DeepL" credit rather than a mandated badge.

DeepL API Free allows 500,000 characters per account per month at no charge and no billing details — a hard cap (HTTP 456), not an overage. The product debounces and cancels stale draft requests, enforces a 4,000-character request ceiling, keeps the API key server-only, and returns a clear degraded state when the DeepL key or service is unavailable. A missing live translation must never block writing or correction.

A durable Postgres-backed per-user guard reserves each attempted live translation before DeepL is called: at most 20 requests and 20,000 input Unicode code points per UTC minute, plus 100,000 input code points per UTC calendar month. A transaction-scoped advisory lock keeps concurrent server instances from overspending the same allowance. A request aborted after its reservation remains counted deliberately: this makes the accounting atomic and conservative rather than trying to reverse a reservation that could race another request. The monthly per-learner cap prevents one learner from exhausting the shared provider allowance. Rate and monthly-limit responses use `TRANSLATION_RATE_LIMITED` and `TRANSLATION_MONTHLY_QUOTA_REACHED`, return `Retry-After` plus a UTC `resetAt`, and map to localized recovery copy.

## Authentication and identity decision

Clerk owns sign-in, sign-up, password recovery, and the Google social
connection. The application still owns its local CUID `User.id`: it remains
the foreign key on essays, subscriptions, translation quotas, and Stripe
metadata. A nullable unique `User.clerkUserId` maps Clerk's subject to that
existing CUID before any protected route reads or writes application data.
This prevents an authentication-provider migration from changing learner
ownership or Stripe history.

Existing bcrypt credentials are imported into Clerk with the local CUID as
Clerk's server-controlled `externalId`. The first authenticated request can
link that exact external ID to its local user record; it must not link a
legacy account merely because two accounts share an email address. New Clerk
users receive a new local CUID record. Existing sessions do not transfer, so
learners sign in once through Clerk after the cutover.

### Unofficial fallback when DeepL is unconfigured or exhausted

If `DEEPL_API_KEY` is unset, or DeepL returns its documented HTTP 456 (monthly quota reached), the route falls back to an unofficial method that calls Google Translate's public web endpoint directly (no API key, no billing, but also no SLA and against Google's Translate ToS). Any other DeepL failure (invalid key, network error, malformed response) fails closed instead — only quota exhaustion or a missing key reaches the fallback, since those are the only cases with an unambiguous signal.

Two safeguards keep this stopgap from becoming a silent, unmanaged dependency:

- **A durable, project-wide circuit breaker.** The fallback is shared infrastructure (one outbound path), so failures are tracked project-wide, not per learner: after 5 consecutive fallback failures it stops being attempted for a 10-minute cooldown and the route returns a stable `TRANSLATION_FALLBACK_UNAVAILABLE` response instead of continuing to hit a broken or blocked endpoint.
- **A learner-facing disclosure.** Whenever a translation was produced through the fallback rather than DeepL, the UI shows a distinct notice saying so, rather than presenting it as an ordinary result.

## Interaction and recovery flow

`Choose task → read fixed instructions → choose or enter topic → write → request correction → review feedback`

The learner should be able to complete that path without having to remember word limits or recover from an ambiguous state.

| State / transition | Product behavior | Why |
| --- | --- | --- |
| No task selected | Only the three task choices are shown. Selecting one immediately reveals its fixed instructions and target range. | It gives a clear first action without exposing fields that lack context. |
| Task, but no topic | “Get a topic from recent exams” and “Write or paste my own topic” are visible before the editor can be submitted. The source action requests the current month's matching Tâche, then retries exactly once with the prior month only if the current WordPress page is not published. | A response without a prompt cannot receive task-specific feedback; the narrow fallback keeps the action usable during the publisher's normal early-month delay without masking an outage or changed source. |
| Neither month is published | The learner sees a message stating this month's (and last month's) recent-exam topics are not published yet, distinct from the generic “topic unavailable” retry message, and the paste-your-own path stays available. | A learner who tries early in the month is not the same case as an actual outage or a parser broken by an upstream redesign; a distinct message avoids implying a retry will help when the topic simply doesn't exist yet. |
| Changing the active task | Clicking the already-selected task does nothing. Switching tasks after entering a topic, draft, or feedback asks before clearing that work. | Task changes invalidate the context; accidental re-clicks and irreversible draft loss are avoidable. |
| Changing a topic or topic mode | If a draft or feedback exists, ask before clearing those response-specific results. | Retaining an essay under a different prompt risks feedback that appears valid but is about the wrong task. |
| Changing task with a selected topic | A selected recent-exam topic counts as work even before the learner starts writing, so task switching asks before discarding it. | A prompt choice is meaningful learner progress and should not silently disappear. |
| Request in progress | The correction control says “Correcting…”, the response context is temporarily locked, and assistive technology receives a status update. | It confirms the click registered and prevents the visible prompt or essay from drifting away from the submitted version. |
| Request succeeds | Focus moves to the labelled feedback region, which contains the word-count result, estimated CEFR / CECRL level, corrected text, errors, and suggestions. | The result may land below the fold; moving to it removes the need to hunt for the outcome. |
| Learner edits after feedback | Feedback stays available but is visibly marked as applying to the prior submission, with a clear invitation to correct again. | A learner often revises immediately; silently presenting old feedback as if it applies to the new draft would be misleading. |
| Live translation | After a brief pause, the French draft is shown in the selected feedback-and-translation language. The result expands with the text, ignores obsolete requests, and never shows a response for a different draft or language. | Translation is a writing aid, so it must remain legible and trustworthy while the learner types. |
| Topic or correction request fails | A concise, retryable error is shown and announced; the learner's current work stays in place. While a replacement topic loads, the editor and correction action are disabled, so the old context cannot be submitted. | A transient model or network failure must not cost the learner their writing, while the temporary loading lock prevents an older prompt or draft from being submitted as a replacement is fetched. |

## Product and technical contract

### Recent-exam source

The recent-exam action is server-side only. It derives the authorised source
URL from the server's current UTC month and year, verifies that the returned
page declares that same month, and extracts only the literal task heading that
matches the learner's `TASK_1`, `TASK_2`, or `TASK_3` selection. It does not
trust a client-provided source URL, month, task label, prompt, or external
identifier. If and only if the authorised WordPress endpoint returns an empty
result (the month has not been published), it retries exactly once against the
immediately preceding UTC month and verifies that page in the same way. A
transport failure, malformed response, changed page structure, or missing task
fails closed without an older-topic fallback.

If neither the current nor the prior month has been published, the API
returns a stable `RECENT_EXAM_NOT_PUBLISHED` code (HTTP 404), distinct from the
generic unavailable response used for a transport failure, malformed response,
or changed page structure. The client renders a matching “not published yet”
message rather than its generic retryable-error copy, since a retry cannot
succeed until the publisher's next update.

Each retrieved prompt is persisted under an immutable content-based external
reference. If the upstream source changes, the revised content becomes a new
topic record rather than rewriting the context of earlier essays. The correction
API uses the record ID as its authoritative prompt context.

### Input

| Field | Rule |
| --- | --- |
| Task | Exactly one of `TASK_1`, `TASK_2`, or `TASK_3`; instructions and word range come from the static task configuration. |
| Topic | Either a server-authoritative current-month recent-exam topic for the selected task, or an immediately preceding-month topic only after the current source returns an empty result, or a non-empty learner-supplied prompt (up to 2,000 characters). The recent-exam topic's stored ID, not a client-supplied prompt, is used during grading. |
| Essay | Non-empty French response, up to 20,000 characters. The visible word counter and server use whitespace-delimited words. |

### Output

Gemini must return a structured object with:

- corrected French text that preserves the learner's ideas;
- an estimated CEFR level (`A1`–`C2`) for the original response;
- an in-range/out-of-range word-count judgement plus an explanation;
- zero or more errors with original excerpt, correction, short explanation in the learner's selected feedback language, and category;
- a summary and actionable suggestions in the learner's selected feedback language.

The API treats malformed input, an unknown/mismatched selected topic, a model refusal, a malformed structured response, and an upstream model failure as request failures. It must not save an `Essay` until a valid feedback object is available; the learner sees a retryable error instead. This avoids audit records that look successfully reviewed when they were not.

## Validation plan and success metric

The phase passes only after an evaluator reviews a stratified sample of **30 successful live Gemini reviews** (10 per task; include below-range, in-range, and above-range responses and a range of learner proficiency). The baseline is unmeasured at the start of Phase 1; this review establishes it.

For each review, a TCF-qualified reviewer—or two reviewers with disagreements adjudicated by one qualified reviewer—records whether:

1. every surfaced correction is materially correct and preserves the intended meaning;
2. the word-count judgement is correct under the product's displayed counting rule;
3. the CEFR estimate is within one CEFR band of the reviewer estimate;
4. the feedback identifies the most important improvement opportunity and offers at least one actionable next step.

**Advance recommendation:** proceed to the next product phase if at least 27 of 30 reviews (90%) meet all four checks, there are no high-severity meaning-changing false corrections, and structured-response completion is at least 95% across the sample. If these conditions are not met, improve the rubric/prompt/schema and repeat the sample before investing in retention or billing features.

This metric intentionally weights harmful false corrections more heavily than a merely unhelpful suggestion. A 90% threshold is a decision gate, not a claim of statistical proof; the small sample is appropriate for discovering whether the core value proposition is viable before expanding scope.

## Review workflow

1. Collect current-month topics (or the permitted immediately prior-month fallback when the current page is unpublished) and prepare the 30 consented test responses.
2. Submit each response through the production-like loop using a live `GEMINI_API_KEY`.
3. Export the persisted `Essay` and `Feedback` records for blinded review; redact learner identifiers from the review sheet.
4. Score with the four checks above, log failures by task, error category, and severity, then make the advance/iterate decision against the stated gate.

The current persistence model is sufficient for this small, manual audit. A dedicated evaluator-rating table or analytics events would be follow-up work only if the loop passes and validation becomes ongoing.

## Alternatives considered

**Free-form model response** — rejected because the UI and audit protocol need stable fields, and a prose blob makes it too easy to omit a required review element.

**Build billing or more account features first** — rejected because it would add funnel mechanics before there is evidence that the paid-for outcome is valuable. Clerk authentication is limited to ownership of submitted writing and secure access to the writing loop.

**Automatically generate all topics with AI** — rejected for Phase 1 because a current recent-exam source and custom prompts cover the required variety without adding another unvalidated model workflow.

## Open questions

- Which qualified reviewer(s) will conduct the 30-sample audit, and where will the redacted score sheet live?
- Should the visible label use the French exam terminology “CECRL” alongside the internationally familiar “CEFR”? The stored level scale is the same; this is a UX wording decision, not a grading-model change.
