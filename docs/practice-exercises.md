# Practice exercises — one task, written section by section

**Problem** — Writing a whole TCF response in one go is hard to rehearse. A learner who struggles with, say, the opening of a message or the synthesis of two documents has no low-stakes way to practise that move with the right length in mind.

**Job to be done** — When I want to rehearse a TCF written task, let me write it in a few short sections, each with its own word range and objective, then compare each section with a model answer so I can see what to aim for.

## Behavior

`Choose a task → choose a target level → start the exercise → write each section → show its model answer → compare`

- There is exactly one exercise per task and level (nine in total). The level changes the scenario and the model answer, never the sections.
- The exercise shows the situation (and, for Tâche 3, the two documents) in French, as in the exam, then one writing box per section. Each box has its own live word count against the section's range. The count is informational; nothing is blocked.
- A section's **Show model answer** button reveals that section's model answer under the learner's draft. The draft stays editable and unchanged.
- There is **no scoring, no AI correction, and no model call**. The comparison is the learner's own.
- Once all three model answers have been shown, the exercise is complete. The learner can practise again (blank sections), choose another exercise, or go to Simulate.

## Sections and word ranges

| Task | Section | Words | Objective |
| --- | --- | --- | --- |
| 1 | Opening | 10–15 | Indicate who you are writing to and why. |
| 1 | Development | 50–70 | Address each required element. |
| 1 | Closing | 10–20 | Conclude the message appropriately for the situation. |
| 2 | Present the situation | 20–30 | Where and when did it take place? What was the situation? |
| 2 | Recount the events | 45–60 | What happened first, next, and finally? Which details matter most? |
| 2 | Comment and conclude | 40–55 | What did you think, and why? What did you learn or recommend? |
| 3 | Synthesis of the two documents | 40–60 | Main idea of each document and how they relate (opposition, difference, common point). |
| 3 | Your position | 15–25 | State your opinion explicitly. |
| 3 | Arguments and example | 55–75 | Two reasons, at least one with a concrete example, and a closing sentence that reinforces the position. |

Tâche 2's first section shows a French example sentence; Tâche 3's position section shows one too. Tâche 2's events and Tâche 3's synthesis and arguments sections show useful connectors. Section labels and guidance are interface copy and exist in English, French, Spanish and Portuguese (`practice.sections` in `src/lib/app-copy.ts`). Word ranges, examples, connectors, scenarios, documents and model answers are French content in `src/lib/sectioned-practice.ts`.

## Content rules

- All content is authored data. `src/lib/sectioned-practice.ts` has a test that every model answer fits its section's word range, counted both as whitespace-separated tokens (the app's rule) and as words only, so a spaced `:` or `!` cannot push a model out of range.
- New exercises (for example a second scenario per task and level) are added to `SECTIONED_PRACTICE_EXERCISES` with a unique id. The picker currently opens the single exercise for the chosen task and level.
- The model answers were drafted for this feature and should be reviewed by a French teacher before wide release.

## Persistence and progress

- Drafts and which model answers were shown are kept in this browser's `localStorage` only (`src/lib/practice-draft-storage.ts`), so a refresh restores the exercise. Leaving an exercise with unsaved writing asks first and then discards the draft.
- Completion is recorded server-side in the existing `PracticeSession` / `PracticeExerciseCompletion` tables, so the Dashboard's practice activity needs no migration. A session is created when the third model answer is shown, never earlier. The completion is `SELF_REVIEW` if the learner had written something in every section before showing its model answer, and `REVEALED` (counted as "with help") otherwise.
- The Dashboard shows exercises completed and the independent/with-help split. The earlier "task parts trained" figure no longer applies and was removed. Completions recorded by the earlier part-by-part trainer still count.
- "Clear progress" on the Dashboard deletes all sessions, as before.

## Replaced design

This replaces the earlier part-by-part trainer (about ten task parts per task, three levels, and a recognise → develop → produce progression with curated multiple-choice and open exercises). Its question bank and tests were removed with it; they remain in git history.
