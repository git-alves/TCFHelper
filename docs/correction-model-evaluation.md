# Correction model evaluation and CEFR calibration

**Problem** — TCF learners receive a CEFR estimate from the correction flow, but reported boundary errors (for example, a C2 response reported as C1 or a C1 response reported as B2) undermine the feedback's central promise. A one-band error is not harmless at these boundaries: it can direct a learner toward the wrong practice level and makes progress tracking untrustworthy. The present validation gate allows a CEFR estimate within one band, so it cannot detect this specific failure reliably.

**Job to be done** — When a learner submits a TCF writing task, give them a conservative but evidence-based level and correction that a qualified reviewer would recognize as appropriate for the original writing, so they know what to practise next.

## Goals / non-goals

### Goals

- Establish an adjudicated, de-identified benchmark of original French responses for Tâches 1–3 at B2, C1, and C2.
- Compare a fixed correction prompt across configured Gemini and OpenRouter models using identical inputs and the existing feedback schema.
- Measure exact CEFR-boundary performance separately from correction quality, task fulfillment, JSON completion, latency, and cost.
- Identify whether a failure is caused by an incorrect reference label, model choice, prompt calibration, or an unsafe response policy before changing production behavior.
- Make one evidence-backed provider/model decision and retain a rerunnable benchmark for future prompt or model changes.

### Non-goals

- This does not claim an official TCF result or replace two human TCF examiners.
- This does not use a student's requested target level as truth; labels concern only the submitted original text.
- This does not put an experimental model comparison, chain-of-thought, or a second model call in a learner's request path in the first release.
- This does not treat a model reviewing its own answer as ground truth.
- This does not change the learner-facing schema or CEFR labels until a candidate meets the release gate.

## Constraints and current state

`buildCorrectionSystemPrompt` is the single prompt source; it intentionally distinguishes an occasional demonstrated level (`estimatedLevel`) from the consistently controlled level (`conservativeLevel`). The displayed/recorded level is the latter. Native Gemini and OpenRouter already implement the same `CorrectionProvider` contract and are selected centrally, so a benchmark can exercise each model without duplicating grading logic.

The current production sample asks whether a level is within one CEFR band. Retain that metric for broad safety, but do not use it to select a model: both C2→C1 and C1→B2 pass it even though they are the failures under investigation.

## Decision

Build an offline, human-labelled evaluation harness first, run a prompt-and-model benchmark, and only then change the production provider/model. Start with a calibrated single-pass model. Use an independent review prompt only as an evaluation and disagreement-triage tool; promote it to production only if it improves the full benchmark enough to justify its extra cost and latency.

This is preferred to changing models from live anecdotes or immediately adding a two-pass reviewer. It separates four explanations that otherwise look identical to a learner: a weak reference label, an ambiguous short response, an inadequate rubric prompt, or a model limitation. It also uses the existing provider seam instead of committing to a vendor before quality is known.

## Benchmark design

### Reference set

Create a versioned, access-controlled fixture set; do not commit identifiable learner writing or API keys. Each case contains:

| Field | Purpose |
| --- | --- |
| `id`, `taskType`, `topicPrompt`, `wordCount`, `essay` | Reproduces the exact grading context. |
| `reference.estimatedLevel`, `reference.conservativeLevel` | Adjudicated labels for the original writing, kept distinct. |
| `reference.confidence`, `rationale`, `evidence` | Makes a disagreement reviewable rather than a black-box label. |
| `expectedTaskFulfillment`, `knownCorrectionRisks` | Separates CEFR calibration from a wrong-task or meaning-changing-correction failure. |
| `source`, `consent/redaction status`, `setVersion` | Preserves provenance and prevents accidental use of private data. |

Two qualified French/TCF reviewers label each response independently while blinded to model output. An adjudicator resolves disagreements and records why. Include genuine learner work where consent permits plus purpose-written anchor responses; do not label generated text only, because it is often unnaturally clean.

The pilot set is 54 cases: 3 tasks × 3 secure levels (B2/C1/C2) × 6 responses. It must include short-but-valid responses, mixed B2/C1 and C1/C2 evidence, register/task-fulfillment problems, and texts with meaningful corrections. This is enough to expose obvious regressions, not to certify a winner. The release set is at least 108 cases (12 per task/level cell), with additional C1/C2 borderline examples whenever the pilot exposes boundary disagreement.

### Runs

For every candidate, call the same production prompt builder, provider adapter, response schema, timeout, and parsing path used by correction. Freeze and record:

- benchmark-set version and prompt-override version;
- provider and exact model identifier;
- temperature/other decoding settings, schema version, and application commit;
- timestamp, request completion/error, latency, token/cost data when the provider returns it; and
- raw response stored only in the restricted evaluation store.

Run each case at least three times if the provider is non-deterministic. Report both the per-run result and the modal result; a model that varies by a CEFR band is not suitable merely because one run looks good. Keep failed structured responses in the denominator.

### Scorecard and release gate

Report results by task and by reference level, not only a single average. The required metrics are:

1. Exact `conservativeLevel` accuracy and macro-average across B2/C1/C2.
2. C2 false-downgrade rate (`reference C2` → predicted below C2) and C1-to-B2-or-lower rate. These are primary defect metrics.
3. Overstatement rate (predicted above the secure reference level) and the existing within-one-band safety metric.
4. Meaning-preserving, materially correct correction rate, task-fulfillment accuracy, valid-schema completion, p50/p95 latency, and cost per completed correction.
5. Run-to-run agreement for each case and model.

A model/prompt is eligible for a limited production trial only when the release set has no high-severity meaning-changing correction, at least 95% valid-schema completion, at least 80% macro exact secure-level accuracy, and no worse than 15% on either primary boundary defect metric. These are initial product gates, not statistical certification; if the human panel's own agreement is below the gate, the reference set must be repaired before judging the model.

For each candidate, include a confusion matrix. A high overall score with C2 concentrated in the C1 column is a rejection, not an acceptable trade-off.

## Calibration experiment

Run these variants against the same locked pilot before choosing a more expensive model:

1. **Baseline** — current prompt and current correction model.
2. **Anchored prompt** — retain the present conservative policy, but add short task-specific, adjudicated B2/C1/C2 contrast examples and require the evaluator to identify sustained evidence before assigning each CEFR field. Do not expose chain-of-thought; request concise evidence in the existing rationale field only.
3. **Candidate models** — compare the baseline and anchored prompt on a small, cost-conscious model and one or two stronger models available through the current Gemini/OpenRouter configuration. Select candidates by measured quality, supported structured output, latency, data-processing terms, and cost—not a model-family reputation or a changing “latest model” label.

Use the pilot only to eliminate weak candidates and tune the prompt. Lock the chosen prompt before the 108-case release run; repeatedly editing it against the release set would overfit the benchmark.

## Review-prompt option

An independent reviewer can be useful, but only under a disciplined design:

- Give the reviewer the task, topic, original essay, and rubric; do **not** show the first model's level or rationale, which would anchor its judgment.
- Ask for the same structured CEFR fields plus concise original-text evidence. Compare the two outputs after both calls complete.
- In offline evaluation, use disagreement to create a human-review queue and discover missing rubric distinctions. It is not an automatic truth signal: two models can agree and be wrong.
- Do not automatically choose the lower result in production. That policy would systematically worsen the reported C2→C1 problem. Any resolution policy must beat the single-pass benchmark on the locked release set.

If a later production trial is justified, invoke the reviewer only for pre-defined uncertainty signals (for example `confidence: Low`, a demonstrated/secure-level gap, or a boundary-level result). Log the disagreement for audit and keep the learner result from the proven single-pass model until the resolution policy itself is validated.

## Delivery plan

1. **Prepare labels.** Recruit reviewers, define the rubric sheet, create and adjudicate the 54-case pilot, then calculate reviewer agreement. Owner: product + qualified reviewers.
2. **Build a non-production evaluator.** Add a protected CLI/job that reads the fixture, calls a named provider/model override, validates via `freshEssayFeedbackSchema`, and writes a CSV/JSON scorecard plus confusion matrix. It must never write `Essay`/`Feedback` records or use production learner data. Owner: engineering.
3. **Benchmark and calibrate.** Run baseline, anchored-prompt, and selected model candidates. Inspect all primary-boundary failures with the reviewers, then make at most one prompt revision before locking the candidate.
4. **Confirm.** Expand/finalize the 108-case release set and run the locked candidate. Publish the scorecard and decision in the repository without raw private essays.
5. **Roll out safely.** Change the admin-configured provider/model, monitor the same metrics on consented or redacted audit samples, and retain the former configuration for rollback. A review-prompt production experiment is a separate decision after this step.

## Alternatives considered

**Change to a stronger model immediately** — fastest to try, and the existing OpenRouter adapter makes it technically easy, but it gives no proof that the apparent improvement is real or that the C1/C2 boundary improved. Use it as a benchmark candidate, not the decision process.

**Prompt-only fix** — lowest incremental cost and worth testing first. It may solve ambiguity in the current instructions, but it cannot overcome a model that lacks reliable French CEFR calibration. It needs the same benchmark to tell whether it worked.

**Always use a review prompt** — may reduce some errors, but doubles model cost and adds latency; agreement is not accuracy, and a conservative tie-break can deepen under-classification. Keep it offline until the resolution policy clears the release gate.

**Human review of every correction** — highest-confidence route but incompatible with immediate scalable feedback. Reserve human review for benchmark labels, safety audits, and model disagreements while the product validates automation.

## Open questions

- Which reviewers are qualified and available to label/adjudicate the reference set, and what level of learner consent permits use of historical essays?
- What per-correction latency and cost ceilings are acceptable for the limited trial? These determine which stronger-model candidates are commercially viable after quality screening.
- Should the first evaluator ship as a repository CLI with a restricted local fixture, or as an owner-only internal job with encrypted result storage? The answer depends on where approved benchmark essays may be stored.
