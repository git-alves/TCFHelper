# Timed task — focused TCF pacing practice

**Problem** — Learners can know the task requirements yet still run out of time in the 60-minute TCF written-expression exam. They need a low-pressure way to rehearse the pace appropriate to the one task they are practising, including planning and final checking, without an always-on clock distracting normal writing.

**Job to be done** — When I am practising a TCF writing task, help me complete this task within its recommended exam pace so I can build timing confidence before attempting a full exam.

## Goals / non-goals

### Goals

- Make an optional **Timed task** practice mode available after the learner has selected a task and supplied a topic.
- Give one clear countdown recommendation for the selected task, derived from a 60-minute, three-task exam plan.
- Show lightweight, non-blocking phase prompts for planning, drafting, and checking; the learner can keep writing, pause, or end at any time.
- Keep timing plans static, local, and explainable; no AI, server request, or exam-attempt record is required.

### Non-goals

- Do not claim the countdown is an official TCF rule or that completing it on time predicts a score.
- Do not force or lock the editor when time expires, auto-submit work, or penalize the learner.
- Do not add automatic stage detection based on word count or text analysis.
- Do not add a 60-minute multi-task simulation in this release. The present workspace intentionally clears a draft when the learner changes task, so a real simulation would otherwise lose work and misrepresent the exam.

## Decision

Ship **single-task timed practice** first. The learner turns on `Timed task` beside the existing target-level and Writing-guide controls, sees the recommended duration before starting, and explicitly starts the countdown. Once running, the live timer belongs in a slim sticky status strip directly above the editor—not in a modal, the guide panel, or a distant page header—because this keeps the deadline and the word count visible while they write without covering the text area.

Use a fixed 60-minute allocation of **12 minutes for Tâche 1, 20 minutes for Tâche 2, 23 minutes for Tâche 3, and 5 minutes for final cross-task review**. This is preferred to broad overlapping ranges because practice works best against one repeatable target, and the allocations total exactly 60 minutes. Solo task practice folds its task-specific check into that task's countdown; the five-minute cross-task review is relevant only to a future full simulation.

## Details

### Entry and display

Before a timer starts, the compact `Timed task` control opens an inline popover:

`Practice Tâche 1 — 12 minutes`

`Plan 2 min · Write 8 min · Check 2 min`

`Start timed task`

The learner may expand the secondary **Change duration** control before starting. It changes the total countdown only; the recommended plan remains the default and its phase proportions scale to the selected duration.

Do not show a running clock until the learner has clicked Start. The control is disabled without a selected task and non-empty topic, matching the Writing guide's availability.

While running, render a sticky strip between the editor toolbar and the textarea:

`Timed task · Tâche 1 · Writing  |  07:42 remaining  |  Pause  End`

The strip includes a subtle progress bar, an accessible text equivalent, and a link/button to expand the phase plan. The existing word count remains in the editor toolbar; it is an independent requirement and should not be replaced by the clock. On narrow screens, the strip wraps its controls but remains above the textarea rather than becoming a floating overlay.

At a phase boundary, update the text in the strip—for example, `Check · 02:00 remaining`—and make one polite, optional announcement. No audio alarm is enabled by default. At zero, show `Time is up — finish or keep writing`, with `Add 2 minutes` and `End timed task`; the editor remains fully usable.

### Recommended plan

| Mode | Total | Phase prompts |
| --- | ---: | --- |
| Tâche 1 | 12 min | Plan 2 min: recipient, purpose, suitable tone. Write 8 min: answer every requested point directly. Check 2 min: reach 60–120 words; scan agreements, accents, and common verb forms. |
| Tâche 2 | 20 min | Plan 3 min: select genre, title/opening, and structure. Write 15 min: recount and comment coherently. Check 2 min: reach 120–150 words; review connectors, register, and coverage. |
| Tâche 3 | 23 min | Analyse 5 min: identify each document's central idea. Synthesize 5 min: present both viewpoints without your opinion. Argue 11 min: give a clear position with two or three developed arguments. Check 2 min: reach 120–180 words and review balance, cohesion, and accuracy. |
| Future full simulation | 60 min | Tâche 1 12 min + Tâche 2 20 min + Tâche 3 23 min + 5 min final review across all responses. |

The task's existing Writing guide remains available during timing practice. Its stage tips and the timer phase can be related but neither should automatically move the other: a learner may need more planning time, and the guide must not turn the countdown into a rigid script.

### State, reliability, and accessibility

The plan is static typed application data, keyed by `TaskType`; it is not a database model. A running timer stores an absolute `endsAt` timestamp plus task and phase-plan version in local storage. Derive remaining time from the current clock rather than decrementing a counter, so it remains accurate after backgrounding the tab or a delayed browser interval. On reload, offer `Resume timed Tâche 2` only if the matching task/topic is still active; otherwise discard the stale session. If local storage is unavailable, keep the timer for the current page session.

Pause is local and explicit. Starting a new topic, clearing the draft, changing tasks, or navigating away ends the timer after the existing unsaved-work confirmation where applicable. A hidden live region announces start, pause/resume, a phase change, and expiry once; it does not announce every second. Colour alone must not communicate urgency.

No API, database migration, or network dependency is needed. A browser clock change may make the timer jump; display the recalculated remaining time and let the learner continue, pause, or end. This is a practice aid, not proctoring.

### Rollout order

1. Add the typed timing plan and duration/phase-boundary tests; verify task totals and the 60-minute aggregate.
2. Add the optional single-task control, countdown strip, pause/end flows, and localized copy.
3. Verify keyboard operation, screen-reader announcements, reload/background accuracy, and coexistence with the Writing guide and word count.
4. Only after this is reliable, design a dedicated full-exam session that keeps three prompts and three drafts intact while the 60-minute timer runs.

## Success metric

The first release succeeds if at least 20% of eligible single-task practice sessions start a timed task, and at least 60% of those sessions reach an explicit end or expiry event. Baselines are currently unmeasured. Collect only start, pause/resume, end/expiry, selected task, and elapsed-time bucket after privacy review—never the draft text.

## Alternatives considered

**Always-visible global timer** — rejected because it adds pressure during ordinary practice and wastes prominent editor space when timing is not the learner's goal. An explicit opt-in gives control back to the learner.

**Put the timer only in the Writing guide** — rejected because timed practice is useful without guided writing, and a learner can close the guide while still needing the deadline. The editor-adjacent strip remains visible in both cases.

**Launch with a full 60-minute mock** — deferred. It is the right eventual experience, but requires a session that safely retains all three topics and drafts as the learner changes tasks. A single editor countdown is not an acceptable substitute.

## Open questions

- Confirm the final recommended allocation with a qualified TCF educator before presenting it as exam-practice guidance. Until then, label it “recommended practice pace,” not “official timing.”
- Decide, after the single-task release is evaluated, whether completed timed sessions should be saved to progress history or remain ephemeral.

## Recommendation

Build the opt-in 12/20/23-minute task timer first, displayed as a sticky editor-adjacent countdown with phase prompts. It gives learners an immediately useful pacing exercise while avoiding the draft-preservation and navigation complexity of a full mock exam. Treat the 60-minute three-task simulator as a separate follow-up feature, not a checkbox inside this timer.
