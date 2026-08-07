# Correction Review Modal

**Problem** — A completed correction currently lands as a long inline block beneath the editor. Learners need to compare the assessed submission with the corrected version, understand the most important feedback, and return to revision without losing their place. The supplied modal template also asks for score, model-text, and export affordances that must not imply a teacher review or official TCF result when the product cannot support those claims.

**Job to be done** — When I request a correction, show me the exact version that was assessed alongside a clear explanation of what changed, so I can understand what to revise and use a stronger example as inspiration.

## Goals / non-goals

### Goals

- Open a responsive correction-review modal as soon as a valid correction request begins, showing loading, result, and retryable-error states.
- Preserve the exact submitted draft for comparison; never compare feedback against text that may have changed after submission.
- Provide a fixed header and footer, submission reference, status/word-count/level badges, and three tabs: overview, compared text, and feedback/tips.
- Show a global AI-learning visualization alongside the three criterion rows, without presenting the result as an official TCF score.
- Show error snippets in the original text with a correction tooltip, corrected snippets in green, and structured, keyboard-operable correction cards.
- Back the three score rows and model version with structured model output, then label them as AI-generated learning aids rather than official TCF scores or teacher feedback.
- Offer browser-native print / Save-as-PDF for the current correction.

### Non-goals

- No claim of an official TCF score, teacher review, teacher chat, teacher audio, or student-name lookup.
- No server-rendered/downloadable PDF, stored PDF binary, or new PDF-rendering dependency.
- No persistent `read` state or history UI; the “Mark as read” control applies only to the current browser session.
- No change to the assessment audit standard or any attempt to derive scores from CEFR level, error counts, or word count.

## Decision

Use a controlled client-side dialog in the writing workspace, rather than the existing URL-backed settings drawer. The correction action opens the dialog immediately and records a snapshot of the submitted text. When the correction request succeeds, the same dialog changes to the review tabs; when it fails, it offers retry without discarding the draft.

The correction schema adds three model-assessed, 0–100 learning indicators and a distinct model version. They are rendered only with a visible disclosure that they are AI-generated and not official TCF scores. This adds truthful data for the requested overview and model-version regions without inventing percentages on the client. The fields live in the existing `grammarNotes` JSON alongside the returned response, so this narrowly scoped feature does not need a database migration.

The API's returned `essayId` is retained in workspace state and shown as the submission reference in the completed modal and its printable document. The global visual is not a fourth assessment: it is the rounded arithmetic mean of the three returned AI criteria, labelled as such and displayed beside the criterion legend.

The export control is labelled “Print / Save as PDF” and opens a purpose-built printable document. A real download endpoint would require a secure essay-detail route, a renderer, and a retention policy; it is not justified for this modal-only change.

## Details

### Data contract

The correction response now contains:

- `correctedText`, `errors`, `summary`, suggestions, CEFR estimate, and word-count result (existing fields);
- `scores.content`, `scores.linguistics`, and `scores.vocabulary`, each with an AI-assessed integer score and concise feedback;
- `modelVersion`, a French model response that preserves the learner’s core intent and meets the task word range.

The API persists `modelVersion` and `scores` in `Feedback.grammarNotes`, then returns the same structured object. Malformed or unavailable model output follows the existing retryable correction failure path; no partial feedback is saved.

Each error can carry exact, zero-based UTF-16 offsets for its original and corrected excerpts. The client highlights only when an offset is present and still matches the returned text exactly; otherwise it leaves the prose untouched and keeps the corresponding correction card. This avoids mislabelling a repeated word or phrase without dropping useful error guidance when the model cannot locate an occurrence confidently.

Correction cards use native disclosure controls: every card keeps its error, correction, and category visible, while its explanatory note can be expanded or collapsed with pointer, Enter, or Space input. The first note is open initially so the feedback remains discoverable without requiring a first click.

### Interaction and degraded paths

| Event | Behavior |
| --- | --- |
| Learner selects Correct | Modal opens in a labelled loading state; the editor stays locked by the existing request state. |
| Correction succeeds | Modal switches to the Overview & scores tab and moves focus to the dialog close control. |
| Correction fails | Modal displays the existing concise error and a retry action; the draft remains intact. |
| Learner dismisses while loading | The request may finish, but the dialog respects dismissal; the completed result remains available through “View correction.” |
| Browser blocks the print window | The app renders the same printable correction document in a temporary hidden frame, then opens that frame’s browser print dialog. |
| Learner edits after closing | Reopening displays the saved submission snapshot and a stale-feedback warning, not the new editor text. |

## Success metric

The baseline is unmeasured. In a five-learner usability check, at least four learners should be able to identify one concrete correction and one next improvement action within 60 seconds, and no participant should describe the AI indicators as an official TCF score or a teacher assessment.

## Alternatives considered

**Keep feedback inline** — rejected because comparison and correction cards become hard to scan below the editor, and the requested fixed header/footer and tabs cannot be delivered cleanly.

**Calculate scores from error counts or CEFR** — rejected because such percentages would look authoritative without being a model assessment or an official rubric.

**Add teacher review, durable read receipts, and a generated PDF service now** — rejected because those require new data ownership, authorization, storage, and operational policies that do not improve the core correction-review task enough to earn the complexity.

## Open questions

- If the product later needs official TCF-aligned scoring, which authoritative rubric, score semantics, and reviewer-validation process will govern the replacement of these AI-generated indicators?
- Should correction history expose the persisted `grammarNotes` fields, and if so, what owner-scoped route and JSON validation contract will it use?
