# Practice exercises — curated, task-specific writing trainer

**Problem** — The current TCF task workspace answers whether a learner can complete a whole task and then gives feedback. It does not give a learner who is blocked by one writing move — for example, an appropriate formal opening or a counterargument — a focused, low-stakes way to build that capability before attempting another full response. A generic French exercise library would solve the wrong problem: the useful move, expected register, and degree of argumentation differ materially between Tâche 1, 2, and 3.

**Job to be done** — When I know that one **part of a TCF writing task** is holding me back — for example, a salutation, an opening, a synthesis of source ideas, or a counterargument — help me practise that exact part through small, connected activities that gradually remove support, so I can use it independently in a real TCF response.

## Goals / non-goals

### Goals

- Add a dedicated `/practice` page for structured writing-skill training, distinct from `/tasks`, which remains the full-task performance workspace.
- Require the learner to choose **Tâche**, an ordered **part of the task**, and **target level** (B2, C1, C2). The part menu is derived from the chosen task's writing structure; it must never be a generic cross-task list.
- Keep the same ordered parts for B2, C1, and C2 within a task. The level changes the language, relationships between ideas, register control, and degree of independence used to practise a part; it must not create a different task structure.
- Deliver a fixed, editorially reviewed **six-stage training path** for one part: **Recognize → Complete → Transform → Organize → Develop → Produce**. A fresh replay may select a different reviewed variant *within a training stage*, but it must never reorder the stages.
- Store curriculum content as typed, version-controlled question-bank data. A model may later correct learner production or recommend a next reviewed path, but it must never generate, remix, or select the core exercises dynamically.
- Differentiate B2, C1, and C2 by independence, relationships between ideas, organization, register control, precision, flexibility, and nuance — not vocabulary difficulty alone.
- Make the practice target continuously explicit: for example, `Tâche 3 · Partie 7 : Introduire un contre-argument · C1` and its learner-facing objective.

### Non-goals

- No full-exam simulation, clock, word-range enforcement, or recent-exam-topic retrieval. Those belong to the existing task workspace.
- No generic grammar course, random worksheet generator, or mixing unrelated grammar drills into a task part. Runtime selection may choose only among reviewed variants already assigned to the selected task, part, level, and training stage; it never creates content or changes the scaffold order.
- No claim that completing a path certifies a CEFR level or predicts an official TCF result.
- No authoring/admin interface, spaced-repetition engine, adaptive curriculum, or AI correction in the first release. The source data remains code-reviewed editorial content.
- No scoring of an open-ended `Produce` response as objectively right or wrong. It receives a manually authored checklist and optional self-reflection; later AI correction remains a separately designed feature.

## Decision

Build Practice as a **curated task-part curriculum**, not a question generator. A task owns one ordered structural blueprint of parts, shared by B2, C1, and C2, plus the authored exercise sets for each `task + part + level` path. Some writing competencies recur across parts (such as register or connecting ideas), but their prompts remain task-specific because the communicative demand changes: a Tâche 1 register decision is about recipient and purpose; a Tâche 2 transition connects an experience, reaction, and reader-facing comment; a Tâche 3 transition compares and qualifies viewpoints.

Use a static typed question bank for the launch. This makes content reviewable, testable, deployable with the application, and demonstrably independent of AI. It is preferred to a database/editor because the initial risk is pedagogical quality and task fit, not operational publishing volume. The bank can move to a managed content workflow only after there is evidence of frequent editorial iteration.

Every startable `task + part + level` path must have a complete six-stage training path. This is preferred to showing a large catalogue with partial coverage: it protects the learner from a misleading practice set that stops at a quiz or jumps straight to a paragraph. Training-stage order is learner-facing and fixed because it deliberately moves from controlled recognition to independent production.

Use **part of the task** as the learner-facing concept, not “topic.” In French, the selector and session header use **Partie de la tâche**. Reserve **training stage** / **étape d'entraînement** for the six instructional activities. This distinction prevents the task's writing structure from being confused with the controlled-to-independent exercise sequence.

## Task-part blueprint

The following is the canonical ordered blueprint for each task. A part is an observable component of the response, not a broad grammar label. Part labels may use concise learner-facing French while IDs remain stable. The `Order` communicates where the part normally occurs in the response; it does not require every prompt to need every task part.

An item such as register control, lexical precision, or connecting ideas is a **cross-cutting quality target**. It is practised inside the relevant task part rather than presented as a separate, out-of-sequence part. The bank records it in `subSkill`, `targetLanguageFeature`, and `tags`.

### Tâche 1 — functional communication

Tâche 1 paths train a short message to a defined recipient. They focus on communicative purpose, useful information, and context-appropriate register.

| Order | ID | Learner-facing part | Practice outcome |
| --- | --- | --- | --- |
| 1 | `t1_salutations` | Saluer le destinataire | Choose a greeting that fits the recipient and relationship. |
| 2 | `t1_openings` | Ouvrir et situer le message | Start clearly and naturally in the relevant context. |
| 3 | `t1_message_purpose` | Annoncer le but | State why the learner is writing without unnecessary delay. |
| 4 | `t1_giving_information` | Donner les informations utiles | Include precise, relevant practical details. |
| 5 | `t1_developing_information` | Développer les informations | Add explanation, timing, and useful context to an initial detail. |
| 6 | `t1_asking_information` | Poser des questions | Ask clear, polite, answerable questions. |
| 7 | `t1_making_requests` | Faire une demande | Formulate a request with an appropriate degree of directness. |
| 8 | `t1_suggestions_and_invitations` | Proposer ou inviter | Make an actionable suggestion or invitation and support it with details. |
| 9 | `t1_closings` | Terminer le message | Close appropriately and signal the expected next action where useful. |

### Tâche 2 — recounting and commenting on an experience

Tâche 2 paths train a blog post, email, letter, or note for several readers that recounts an experience or event and comments on it. A personal view, recommendation, or argument is useful only in service of that communicative purpose; this is **not** a detached opinion essay. Paths therefore teach learners to make an experience clear, engaging, and meaningful for their readers, then to develop the commentary that follows from it.

| Order | ID | Learner-facing part | Practice outcome |
| --- | --- | --- | --- |
| 1 | `t2_framing_experience` | Présenter l'expérience | Establish what happened, for whom, and why it matters to the reader. |
| 2 | `t2_narrating_experience` | Raconter les moments importants | Sequence key moments clearly rather than listing disconnected facts. |
| 3 | `t2_describing_reactions` | Montrer les réactions et le résultat | Make the human impact or outcome of an event understandable. |
| 4 | `t2_adding_and_sequencing` | Relier le récit et les idées | Move coherently between event, reaction, comment, and next point. |
| 5 | `t2_commenting_on_experience` | Donner son point de vue | Introduce an evaluation or personal view that follows from the account. |
| 6 | `t2_developing_commentary` | Développer son point de vue | Turn an evaluation into a reasoned, reader-relevant point. |
| 7 | `t2_justifying_opinion` | Justifier son point de vue | Link a comment or recommendation to a reason, explanation, and specific moment from the experience. |
| 8 | `t2_giving_examples` | Illustrer par un exemple | Use a concrete detail from the experience to make commentary credible and specific. |
| 9 | `t2_comparing_experiences` | Comparer des expériences | Compare two options or experiences against relevant criteria. |
| 10 | `t2_cause_and_consequence` | Expliquer la cause et la conséquence | Explain why something happened and what followed from it. |
| 11 | `t2_contrast_and_concession` | Ajouter une limite ou une réserve | Acknowledge a drawback, contrast, or partial exception without undoing the overall account. |
| 12 | `t2_recommending_or_advising` | Recommander ou conseiller | Give readers an actionable recommendation grounded in the experience. |
| 13 | `t2_concluding_experience` | Conclure pour le lecteur | Close by drawing a useful lesson, recommendation, or invitation for the reader. |

### Tâche 3 — argumentation and synthesis

Tâche 3 paths train analysis of a social issue and the synthesis of viewpoints before a defensible position. They focus on accuracy toward source ideas, comparison, and sophisticated qualification.

| Order | ID | Learner-facing part | Practice outcome |
| --- | --- | --- | --- |
| 1 | `t3_framing_issue` | Présenter le sujet et la problématique | Present the issue neutrally and make the analytical question visible. |
| 2 | `t3_reformulating_sources` | Reformuler les idées des documents | Restate each source idea accurately without copying it or distorting its scope. |
| 3 | `t3_comparing_viewpoints` | Comparer les points de vue | Relate viewpoints by agreement, difference, emphasis, and implication. |
| 4 | `t3_synthesizing_information` | Faire la synthèse des documents | Bring multiple viewpoints together into a meaningful relationship. |
| 5 | `t3_taking_position` | Donner son opinion | State an independent, responsive position after representing viewpoints fairly. |
| 6 | `t3_justifying_position` | Justifier son opinion | Develop a position through a warranted reason and relevant evidence or example. |
| 7 | `t3_introducing_counterargument` | Introduire un contre-argument | Acknowledge a credible opposing consideration fairly. |
| 8 | `t3_responding_counterargument` | Répondre à un contre-argument | Limit, refute, or integrate the opposing point without ignoring it. |
| 9 | `t3_nuancing_position` | Nuancer son opinion | Specify limits, conditions, or trade-offs in a defensible position. |
| 10 | `t3_concluding_analysis` | Conclure l'analyse | Reach a coherent conclusion that follows from the comparison and position. |

The flow is always **Task → part of the task → target level**. The task reveals its stable, numbered blueprint first, so the learner sees how the component fits into a complete response before selecting a level. Levels appear on every part because the same part is practised at all levels; the selected level changes the demand, not the part or its position. This means no irrelevant Tâche 1 salutation drill appears under Tâche 3, and no part appears merely because a single quiz exists for it.

The selector must display the full blueprint in `partOrder` order. A level that does not yet have a complete reviewed six-stage path is shown as unavailable for that part, with an editorial “coming soon” state; it is never removed from the task blueprint. Hiding it would incorrectly imply that B2, C1, and C2 have different parts of the task.

## Level calibration

Each part specifies concrete level outcomes. A part has one task-owned identity and position across levels, but it must not be a B2 item with more difficult synonyms substituted into it.

| Dimension | B2 | C1 | C2 |
| --- | --- | --- | --- |
| Independence | Uses a visible model or prompt to complete a clear communicative move. | Chooses and combines relevant moves with limited prompting. | Makes flexible, purposeful choices with no structural template. |
| Relations between ideas | Adds a reason and relevant example; expresses straightforward contrast or consequence. | Handles concession, competing perspectives, and logical hierarchy. | Weighs limitations, trade-offs, and scope with controlled precision. |
| Organization | Follows a clear linear pattern. | Builds coherent paragraphs and manages transitions. | Shapes a concise, natural line of argument for rhetorical effect. |
| Language and register | Accurate, appropriate familiar forms. | Varied, controlled structures and precise linking for the context. | Flexible, idiomatic, exact expression and consistently subtle register control. |
| Production expectation | A sentence or compact, clearly guided paragraph. | An independently organized paragraph that responds to a constraint. | A concise but autonomous, qualified passage that integrates constraints. |

For example, `t1_openings` remains Part 2 — **Ouvrir et situer le message** — at all three levels. At B2, the learner uses a clear, appropriate opening with its purpose. At C1, they establish context and purpose naturally while calibrating the relationship to the recipient. At C2, they make a precise, flexible opening that manages context, expectation, and register without a template. The task part is unchanged; vocabulary is only one consequence of the increasing rhetorical demand.

## Sequence and exercise design

One exercise set always keeps the same writing focus and uses a shared scenario or thematic thread where it helps continuity. It must cover these six activity types:

| Order | Stage | Permitted exercise types | Evidence of progress |
| --- | --- | --- | --- |
| 1 | **Recognize** | Multiple choice; choose the best sentence; identify formulation or register | Learner can distinguish the target move from plausible but unsuitable alternatives. |
| 2 | **Complete** | Cloze; finish a sentence; complete a connector or structure | Learner can supply a constrained missing element. |
| 3 | **Transform** | Reformulate; combine ideas; change register; improve a simple structure | Learner can make the move when its source material is supplied. |
| 4 | **Organize** | Order sentences; arrange opening/development/example/conclusion; identify a logical sequence | Learner can position the move in a coherent local structure. |
| 5 | **Develop** | Guided expansion from an initial idea with required slots or prompts | Learner can add a reason, explanation, example, consequence, contrast, or other skill-specific support. |
| 6 | **Produce** | Independent sentence, paragraph, or short response | Learner uses the target move without sentence-level scaffolding. |

`Develop` and `Produce` are intentionally distinct. Develop gives structured prompts such as “claim → reason → explanation → example”; Produce asks the learner to choose and compose that structure. Every closed-response item must be submitted before the session moves to its next stage; an incorrect response receives its fixed explanation and can be retried. Open responses remain completion-based, accompanied by an editorial checklist rather than a false automatic grade.

### Fixed scaffold, reviewed replay variants

Starting or restarting a part creates a fresh session from the selected `task + part + level` exercise set. The client chooses one manually authored exercise for each of the six training-stage slots, then always presents those slots in ascending order: Recognize through Produce. It does not call a model, construct a new prompt, mix entries from another part, or shuffle the training-stage order.

When a stage has more than one reviewed variant, a replay chooses a different eligible variant for that same stage where possible. When it has only one approved variant, the session safely reuses it; the product must not imply variety that the bank does not contain. `sequenceOrder` and `prerequisiteExerciseId` remain both authoring controls and learner-facing progression controls: they determine the fixed delivery order.

Example set: `Tâche 2 → B2 → Raconter les événements` uses one shared experience across all six stages: choose an appropriate opening; complete a chronological connector; combine an event and reaction; organize the narrative; develop a supplied moment; and write a short blog/email post. On replay, the Recognize slot might use a different reviewed opening and the Complete slot a different reviewed connector, but the learner still completes the six stages in that order.

## Data model and content controls

The bank lives in a typed module, initially `src/lib/practice-curriculum.ts`, accompanied by tests. IDs are permanent and never repurposed; a material editorial revision increments `contentVersion` and records a reason. All French prompts, answers, explanations, and rubrics are manually authored.

```ts
type PracticeTask = "TASK_1" | "TASK_2" | "TASK_3";
type PracticeLevel = "B2" | "C1" | "C2";
type PracticeStage =
  | "RECOGNIZE"
  | "COMPLETE"
  | "TRANSFORM"
  | "ORGANIZE"
  | "DEVELOP"
  | "PRODUCE";
type ExerciseType =
  | "MULTIPLE_CHOICE"
  | "CLOZE"
  | "REFORMULATE"
  | "COMBINE"
  | "REGISTER_CHANGE"
  | "ORDER_SEQUENCE"
  | "GUIDED_DEVELOPMENT"
  | "FREE_PRODUCTION";

type PracticeTaskPart = {
  id: string;
  task: PracticeTask;
  /** Stable position in the task blueprint; never inferred from array order. */
  partOrder: number;
  label: string;
  description: string; // answers “Which part of the task am I practising?”
  levelOutcomes: Record<PracticeLevel, string>;
  tags: readonly string[];
};

type PracticeExercise = {
  id: string;
  contentVersion: number;
  task: PracticeTask;
  level: PracticeLevel;
  partId: PracticeTaskPart["id"];
  subSkill: string;
  stage: PracticeStage;
  exerciseType: ExerciseType;
  prompt: string;
  instructions: string;
  options?: readonly { id: string; text: string }[];
  correctAnswer?: string | readonly string[];
  acceptedAnswers?: readonly string[];
  explanation: string;
  targetLanguageFeature: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sequenceOrder: 1 | 2 | 3 | 4 | 5 | 6;
  prerequisiteExerciseId?: string;
  productionChecklist?: readonly string[];
  tags: readonly string[];
};
```

The task blueprint is defined once and is not level-scoped. An exercise variant belongs to a training-stage group identified by `task + partId + level + sequenceOrder`; all variants in the group must use the stage's activity type. Its permanent `id` distinguishes the reviewed variants, while `contentVersion` records editorial change. Validation must reject a bank entry when its task does not match its part, when its `partOrder` is absent or duplicated incorrectly in the task blueprint, when the set repeats or omits one of the six required training stages, when a variant's activity type does not match its stage, or when it uses an objectively gradable type without a correct/accepted answer. `FREE_PRODUCTION` must instead carry a `productionChecklist`, and has no `correctAnswer`. Tests also assert that each startable part/level path covers all six stages, a session selects only its selected task/part/level entries with exactly one approved variant per stage in fixed order, and the part selector is ordered by `partOrder` and contains only parts owned by its selected task.

The client may save one **unfinished** practice session in browser-local storage so a learner can resume its exact curated sequence after a refresh. The snapshot contains the selected task/part/level, chosen exercise IDs, current training stage, draft response, and session-only completion/difficulty state; it is never sent to the server, used as a learner profile, or retained after completion, discard, or a fresh start. The entry point makes this explicit with **Resume** and **Discard** actions. If browser storage is unavailable, the active sequence still works for the current session. Static curriculum availability never depends on a network model call.

## Experience, architecture, and degraded behavior

`Open Practice → select task → choose the numbered part of that task → select target level → start a staged curated session → complete the six-stage training path`

- Selecting a task resets incompatible part/level choices, explains the task's writing purpose, and shows its numbered parts in their fixed order before exposing levels.
- Selecting a **Partie de la tâche** enables the target-level control. The part list is never filtered by level: each level is shown as startable only when that exact task/part level has a full reviewed exercise set; otherwise show an editorial “coming soon” state rather than a disabled or generated exercise.
- The part selector's placeholder explains that its choices are the ordered components of the selected task. It must be keyboard accessible and never contain a part from another task.
- A session header permanently displays task, part number and label, level, part description, `Exercise n of 6`, and the current training stage.
- Closed exercises expose a single response action, immediate fixed feedback, and an explanation for each retry. They must work by keyboard and communicate state changes to assistive technology.
- The final production activity displays its short, manually written task, target checklist, and a clear distinction between “complete your practice” and “officially correct.” No AI request is needed to finish.
- Completion presents two distinct repeat actions: **Replay with new variants** keeps the fixed six-stage training order and selects a different approved variant within a stage when available; **Start fresh** creates a new curated session without promising different variants. Switching task, part, or level clears the local unfinished snapshot. A page refresh offers Resume/Discard rather than implying a server save.

The question bank is bundled with the application, so there is no curriculum-service outage. A malformed or missing local entry is a deployment defect: fail closed for that path, log the ID server-side where possible, and show a generic unavailable message with a return-to-selection action. Never fall back to another task's part or an AI-created replacement.

## Launch scope, quality gate, and success metric

The launch catalogue is intentionally **complete before broad**. Publish at least two complete `Task × part × Level` paths for every Task × Level cell — 18 paths and 108 manually authored activities — using the canonical blueprint above. To promise replay variety for a startable path, publish at least two reviewed variants for every training stage in that path (12 activities per path, or 216 activities at the 18-path launch gate). Each variant must be reviewed by a qualified TCF educator for task fit, level calibration, answer accuracy, and explanation quality before its `published` flag is enabled. The full task blueprint remains visible; a part/level that is not yet complete shows its unavailable state rather than disappearing or being replaced.

This is a meaningful first trainer without pretending that 216 activities complete the entire curriculum. It is preferred to seeding hundreds of thin or unreviewed items: the product promise is progressive writing practice, and a partial path breaks that promise more severely than a smaller menu.

The release succeeds in the first four weeks when:

1. at least **35%** of authenticated learners who open `/practice` start a path (baseline: unmeasured);
2. at least **45%** of started paths reach the `Produce` activity (baseline: unmeasured); and
3. a blinded TCF-qualified audit of the launch activities finds **0** task-mismatched parts, **0** required-stage coverage violations, and at least **95%** of closed-answer/explanation pairs pedagogically accurate.

Collect only selection, path start, stage reached, closed-answer correctness, retry, and path completion events after privacy review. Do not collect or transmit free-production text in the first release. The success metrics are targets until this minimal, privacy-reviewed instrumentation exists.

## Alternatives considered

**One shared skill list for all three tasks** — rejected. It creates irrelevant choices, hides the communicative differences between tasks, and encourages generic grammar content. Overlapping competencies are deliberately taught inside task-specific parts.

**Generate an exercise from a part with AI** — rejected. It violates the fixed-curriculum requirement, makes content quality and level calibration non-auditable, and adds a dependency to the moment when a learner needs immediate practice.

**Make every item an independent paragraph** — rejected. It measures a capability but does not provide varied rehearsal. Each selected task part instead has a reviewed progression of recognition, completion, transformation, organization, guided development, and production activities, with replay variety coming only from reviewed alternatives for the same training stage.

**Shuffle the six exercise types on replay** — rejected. It can surface independent production before a learner has completed controlled practice, undermining the load-bearing controlled-to-independent learning path. Selecting an authored variant within each fixed stage gives variety without sacrificing the instructional sequence.

**Hide parts that are not yet available at a selected level** — rejected. It makes the structure of the task appear different at B2, C1, and C2, contrary to the curriculum model. Show the same ordered task parts at every level and block only the incomplete part/level path with a candid editorial state.

**Persist all attempts and use them to adapt the next exercise now** — rejected for v1. It raises privacy, data-model, remediation, and algorithm-design requirements without proving that the curated path is engaging. Build trustworthy content and completion first; specify persistent progress separately if the launch metrics justify it.

## Open questions

- Who is the qualified TCF educator responsible for approving each path and recording the review decision/version?
- Should the first production activities offer an opt-in link into the existing correction workspace, or should that handoff wait until the two experiences have a shared, learner-safe context contract?
- Which interface locales need translated instructional copy at launch? French learning material remains French, but headings, controls, and explanations must follow the existing locale policy.

## Recommendation

Proceed with the task-owned, ordered **part-of-task** blueprint and a curated 18-path launch catalogue. The key tradeoff is more editorial work to author level-specific variants in exchange for a stable task structure, honest availability, comprehensive startable paths, replay without losing progression, and independence from AI generation. Treat the first launch as proof that learners will complete focused part practice; expand breadth and persistent progress only after that evidence exists.
