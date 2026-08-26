# Réussir correction examples — proposed fallback, pending permission

**Problem** — A learner who requests an example response can be blocked when the AI example generator is unavailable. For recent-exam subjects sourced from Réussir TCF Canada, a corresponding correction page may contain an example response for the exact task and combination.

**Job to be done** — When the example generator fails for a recent-exam subject, help me find an appropriate example response without presenting another publisher’s work as AI feedback on my own draft.

## Goals / non-goals

### Goals

- Give the learner a useful, clearly labelled fallback when AI example generation is unavailable for a Réussir-sourced recent-exam topic.
- Never return a correction for a different month, combination, or Tâche.
- Make the source and its relationship to the learner’s work unambiguous: it is an external example response, not a correction of the learner’s draft.

### Non-goals

- Do not scrape, store, cache, reproduce, or display Réussir correction text unless Réussir TCF Canada grants written permission or a suitable licence.
- Do not use an external correction as a silent replacement for a failed AI example.
- Do not add a fallback for pasted custom topics, which have no trusted external combination identifier.
- Do not make a network call to this source while the learner writes or while the ordinary guide is open.

## Decision

Do **not** implement in-app retrieval of Réussir correction text now. The publisher’s [terms](https://reussir-tcfcanada.com/mentions-legales-et-cgu/) say that reproducing, distributing, or modifying its content without prior authorisation is prohibited. The correction page also describes its texts as material to generate ideas rather than submissions to use verbatim. See the [August 2026 correction page](https://reussir-tcfcanada.com/aout-2026-correction-expression-ecrite/).

**Approved interim fallback** — A secondary external-link action appears only after an actual AI example-generator/upstream failure for a trusted recent-exam topic: **“View the topic on Réussir”**. It opens the exact `recentTopic.sourceUrl` already returned by the server for that selected subject in a new tab, names Réussir as the source, and keeps the learner’s draft untouched. It is not shown for user quota, cooldown, or rate-limit responses, and it must not claim that Réussir endorses the application.

In-app retrieval is a follow-up only after written permission defines permitted copying, display, caching, attribution, and the treatment of content changes or removal.

## Licensed implementation contract

If permission is granted, implement the source as a deterministic, server-only fallback.

1. Preserve the trusted `combination` returned by `getRecentExamTopic` with the selected recent topic. It is currently used when creating the immutable external reference but is not returned to the browser as a standalone field.
2. Derive the correction URL only from the server-authoritative source month, using the fixed Réussir origin and the matching `*-correction-expression-ecrite` slug. Do not accept a URL from the browser.
3. Parse only the correction block that matches all of: source month, combination number, and selected `TaskType`. Validate bounded response size, content type, origin, no redirect, and the expected structural headings.
4. Return a distinct `source: "REUSSIR_EXAMPLE"` response only when the match is exact. The client presents it as **“Example response from Réussir TCF Canada”**, includes the source link, and explains that it is not feedback on the learner’s writing.
5. On unavailable source, changed page structure, absent matching correction, licensing disablement, or any mismatch, fail closed and preserve the current AI-example error. Never select a nearby task or another combination as a fallback.

The fallback must be triggered only after the normal AI example request has failed and only by an explicit learner click. This preserves the existing AI path as the primary experience and avoids importing external content without the learner’s request.

## Data and rollout implications

- A licensed in-app version needs a reviewed additive field or trusted response data for `sourceMonth` and `combination`; parsing these from an opaque external reference at the UI boundary is not an acceptable contract.
- It also needs parser fixtures for at least two combinations and all three Tâches, plus mismatch and changed-layout failure tests.
- The first production rollout should be feature-flagged. Disabling the flag must immediately restore the current AI-only behavior without affecting topics, drafts, or feedback.

## Success metric

After rights are obtained and the feature is released, a manual audit of 30 fallback attempts must show 100% correct month/combination/task matching and zero cases where an external example is presented as learner-specific correction. Track only fallback offered, clicked, exact match, and unavailable/mismatch outcomes; never send draft text to Réussir for this feature.

## Open questions

- Will Réussir TCF Canada grant a written licence for in-app display and caching of its correction examples, and what attribution or access terms will it require?
- No decision remains for the external-link fallback: it is approved for trusted recent topics after an actual generator/upstream failure. A licence is still required for any future in-app correction-text display.
