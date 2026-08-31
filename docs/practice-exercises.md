# Practice exercises — curated, task-specific writing trainer

**Problem** — The current TCF task workspace answers whether a learner can complete a whole task and then gives feedback. It does not give a learner who is blocked by one writing move — for example, an appropriate formal opening or a counterargument — a focused, low-stakes way to build that capability before attempting another full response. A generic French exercise library would solve the wrong problem: the useful move, expected register, and degree of argumentation differ materially between Tâche 1, 2, and 3.

**Job to be done** — When I know a particular part of TCF writing is holding me back, help me practise that exact task-appropriate writing skill through small, connected activities that gradually remove support, so I can use it independently in a real TCF response.

## Goals / non-goals

### Goals

- Add a dedicated `/practice` page for structured writing-skill training, distinct from `/tasks`, which remains the full-task performance workspace.
- Require the learner to choose **Tâche**, **target level** (B2, C1, C2), and a **topic/skill**. The skill menu is derived from the chosen task; it must never be a generic cross-task list.
- Deliver a fixed, editorially reviewed **six-stage path** for one skill: **Recognize → Complete → Transform → Organize → Develop → Produce**. A fresh replay may select a different reviewed variant *within a stage*, but it must never reorder the stages.
- Store curriculum content as typed, version-controlled question-bank data. A model may later correct learner production or recommend a next reviewed path, but it must never generate, remix, or select the core exercises dynamically.
- Differentiate B2, C1, and C2 by independence, relationships between ideas, organization, register control, precision, flexibility, and nuance — not vocabulary difficulty alone.
- Make the practice target continuously explicit: for example, `Tâche 3 · C1 · Introduire un contre-argument` and its learner-facing objective.

### Non-goals

- No full-exam simulation, clock, word-range enforcement, or recent-exam-topic retrieval. Those belong to the existing task workspace.
- No generic grammar course, random worksheet generator, or mixing unrelated grammar drills into a topic. Runtime selection may choose only among reviewed variants already assigned to the selected task, level, topic, and stage; it never creates content or changes the scaffold order.
- No claim that completing a path certifies a CEFR level or predicts an official TCF result.
- No authoring/admin interface, spaced-repetition engine, adaptive curriculum, or AI correction in the first release. The source data remains code-reviewed editorial content.
- No scoring of an open-ended `Produce` response as objectively right or wrong. It receives a manually authored checklist and optional self-reflection; later AI correction remains a separately designed feature.

## Decision

Build Practice as a **curated task-specific curriculum**, not a question generator. A task owns its own skills, level outcomes, and authored exercise sets. Some competencies recur across tasks (such as register or connecting ideas), but their IDs, outcomes, and prompts remain task-specific because the communicative demand changes: a Tâche 1 register decision is about recipient and purpose; a Tâche 2 transition connects an experience, reaction, and reader-facing comment; a Tâche 3 transition compares and qualifies viewpoints.

Use a static typed question bank for the launch. This makes content reviewable, testable, deployable with the application, and demonstrably independent of AI. It is preferred to a database/editor because the initial risk is pedagogical quality and task fit, not operational publishing volume. The bank can move to a managed content workflow only after there is evidence of frequent editorial iteration.

Every selectable topic must have a complete six-stage exercise path for its task and level. This is preferred to showing a large catalogue with partial coverage: it protects the learner from a misleading practice set that stops at a quiz or jumps straight to a paragraph. Stage order is learner-facing and fixed because it deliberately moves from controlled recognition to independent production.

## Curriculum taxonomy

The following are the canonical task-specific topic sets. A topic is one observable writing competency, not a broad grammar label. Topic labels may use concise learner-facing French while the IDs below remain stable.

### Tâche 1 — functional communication

Tâche 1 paths train a short message to a defined recipient. They focus on communicative purpose, useful information, and context-appropriate register.

| ID | Learner-facing topic | Practice outcome |
| --- | --- | --- |
| `t1_salutations` | Salutations | Choose a greeting that fits the recipient and relationship. |
| `t1_openings` | Ouvrir le message | Start clearly and naturally in the relevant context. |
| `t1_message_purpose` | Annoncer le but | State why the learner is writing without unnecessary delay. |
| `t1_giving_information` | Donner des informations | Include precise, relevant practical details. |
| `t1_developing_information` | Développer les informations | Add explanation, timing, and useful context to an initial detail. |
| `t1_asking_information` | Poser des questions | Ask clear, polite, answerable questions. |
| `t1_making_requests` | Faire une demande | Formulate a request with an appropriate degree of directness. |
| `t1_suggestions_and_invitations` | Proposer ou inviter | Make an actionable suggestion or invitation and support it with details. |
| `t1_functional_register` | Adapter le registre | Control formal, neutral, and informal choices throughout a message. |
| `t1_closings` | Terminer le message | Close appropriately and signal the expected next action where useful. |

### Tâche 2 — recounting and commenting on an experience

Tâche 2 paths train a blog post, email, letter, or note for several readers that recounts an experience or event and comments on it. A personal view, recommendation, or argument is useful only in service of that communicative purpose; this is **not** a detached opinion essay. Paths therefore teach learners to make an experience clear, engaging, and meaningful for their readers, then to develop the commentary that follows from it.

| ID | Learner-facing topic | Practice outcome |
| --- | --- | --- |
| `t2_framing_experience` | Présenter l'expérience | Establish what happened, for whom, and why it matters to the reader. |
| `t2_narrating_experience` | Raconter une expérience | Sequence key moments clearly rather than listing disconnected facts. |
| `t2_describing_reactions` | Décrire les réactions et le résultat | Make the human impact or outcome of an event understandable. |
| `t2_commenting_on_experience` | Commenter une expérience | Introduce an evaluation or personal view that follows from the account. |
| `t2_developing_commentary` | Développer son commentaire | Turn an evaluation into a reasoned, reader-relevant point. |
| `t2_justifying_opinion` | Justifier son opinion | Link a comment or recommendation to a reason, explanation, and specific moment from the experience. |
| `t2_giving_examples` | Illustrer par un exemple | Use a concrete detail from the experience to make commentary credible and specific. |
| `t2_adding_and_sequencing` | Enchaîner le récit et les idées | Move coherently between event, reaction, comment, and next point. |
| `t2_comparing_experiences` | Comparer des expériences | Compare two options or experiences against relevant criteria. |
| `t2_cause_and_consequence` | Exprimer cause et conséquence | Explain why something happened and what followed from it. |
| `t2_contrast_and_concession` | Marquer une limite ou une réserve | Acknowledge a drawback, contrast, or partial exception without undoing the overall account. |
| `t2_recommending_or_advising` | Recommander ou conseiller | Give readers an actionable recommendation grounded in the experience. |
| `t2_concluding_experience` | Conclure le récit et le commentaire | Close by drawing a useful lesson, recommendation, or invitation for the reader. |

### Tâche 3 — argumentation and synthesis

Tâche 3 paths train analysis of a social issue and the synthesis of viewpoints before a defensible position. They focus on accuracy toward source ideas, comparison, and sophisticated qualification.

| ID | Learner-facing topic | Practice outcome |
| --- | --- | --- |
| `t3_framing_issue` | Introduire la problématique | Present the issue neutrally and make the analytical question visible. |
| `t3_reformulating_sources` | Reformuler les idées sources | Restate a source idea accurately without copying it or distorting its scope. |
| `t3_comparing_viewpoints` | Comparer les points de vue | Relate viewpoints by agreement, difference, emphasis, and implication. |
| `t3_identifying_arguments` | Distinguer thèse, argument et exemple | Identify the role of a claim, its support, and its illustration before using it. |
| `t3_taking_position` | Prendre position | State an independent, responsive position after representing viewpoints fairly. |
| `t3_justifying_position` | Justifier sa position | Develop a position through a warranted reason and relevant evidence or example. |
| `t3_introducing_counterargument` | Introduire un contre-argument | Acknowledge a credible opposing consideration fairly. |
| `t3_responding_counterargument` | Répondre à un contre-argument | Limit, refute, or integrate the opposing point without ignoring it. |
| `t3_nuancing_position` | Nuancer sa position | Specify limits, conditions, or trade-offs in a defensible position. |
| `t3_synthesizing_information` | Synthétiser les informations | Bring multiple viewpoints together into a meaningful relationship. |
| `t3_concluding_analysis` | Conclure l'analyse | Reach a coherent conclusion that follows from the comparison and position. |

The flow is always **Task → target level → topic**. The first two choices establish the teaching context; the third control is a topic dropdown populated only with the selected task's published topics at that level. This means no irrelevant Tâche 1 greeting drill appears under Tâche 3, and no topic appears merely because a single quiz exists for it.

## Level calibration

Each skill specifies concrete level outcomes. The same label can exist at multiple levels, but it must not be a B2 item with more difficult synonyms substituted into it.

| Dimension | B2 | C1 | C2 |
| --- | --- | --- | --- |
| Independence | Uses a visible model or prompt to complete a clear communicative move. | Chooses and combines relevant moves with limited prompting. | Makes flexible, purposeful choices with no structural template. |
| Relations between ideas | Adds a reason and relevant example; expresses straightforward contrast or consequence. | Handles concession, competing perspectives, and logical hierarchy. | Weighs limitations, trade-offs, and scope with controlled precision. |
| Organization | Follows a clear linear pattern. | Builds coherent paragraphs and manages transitions. | Shapes a concise, natural line of argument for rhetorical effect. |
| Language and register | Accurate, appropriate familiar forms. | Varied, controlled structures and precise linking for the context. | Flexible, idiomatic, exact expression and consistently subtle register control. |
| Production expectation | A sentence or compact, clearly guided paragraph. | An independently organized paragraph that responds to a constraint. | A concise but autonomous, qualified passage that integrates constraints. |

For example, `t2_justifying_opinion` at B2 asks the learner to comment on an experience with a reason and a concrete detail. At C1 it asks them to develop a reader-relevant evaluation while acknowledging a relevant limitation. At C2 it asks them to formulate a qualified recommendation, state its limits, and make the relationship between the experience, argument, and limitation precise.

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

Starting or restarting a topic creates a fresh session from the selected `task + level + topic` exercise set. The client chooses one manually authored exercise for each of the six stage slots, then always presents those slots in ascending order: Recognize through Produce. It does not call a model, construct a new prompt, mix entries from another topic, or shuffle the stage order.

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

type PracticeSkill = {
  id: string;
  task: PracticeTask;
  label: string;
  description: string; // answers “What am I practising?”
  levelOutcomes: Record<PracticeLevel, string>;
  tags: readonly string[];
};

type PracticeExercise = {
  id: string;
  contentVersion: number;
  task: PracticeTask;
  level: PracticeLevel;
  skillId: PracticeSkill["id"];
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

An exercise variant belongs to a stage group identified by `task + level + skillId + sequenceOrder`; all variants in the group must use the stage's activity type. Its permanent `id` distinguishes the reviewed variants, while `contentVersion` records editorial change. Validation must reject a bank entry when its task does not match its skill, when the set repeats or omits one of the six required stages, when a variant's activity type does not match its stage, or when it uses an objectively gradable type without a correct/accepted answer. `FREE_PRODUCTION` must instead carry a `productionChecklist`, and has no `correctAnswer`. Tests also assert that each published topic covers all six stages, a session selects only its selected task/level/topic entries with exactly one approved variant per stage in fixed order, and the topic dropdown contains only skills owned by its selected task.

The client can keep in-progress navigation and unsubmitted open responses in browser state for v1. Do not persist learner answer text or introduce an attempt schema until a privacy-reviewed progress product is specified. If browser storage is unavailable, the active sequence still works for the current session. Static curriculum availability never depends on a network model call.

## Experience, architecture, and degraded behavior

`Open Practice → select task → select level → choose a task-specific topic from the dropdown → start a staged curated session → complete the six-stage path`

- Selecting a task resets incompatible level/topic choices and explains the task's writing purpose before exposing later choices.
- Selecting a level enables the **Topic** dropdown and limits it to full, published exercise sets for that exact task and level. If none are ready, show an editorial “coming soon” state rather than a disabled or generated exercise.
- The topic dropdown's placeholder explains that its choices depend on the selected task and level. It must be keyboard accessible and never contain a topic from another task.
- A session header permanently displays task, level, topic, skill description, `Exercise n of 6`, and the current stage.
- Closed exercises expose a single response action, immediate fixed feedback, and an explanation for each retry. They must work by keyboard and communicate state changes to assistive technology.
- The final production activity displays its short, manually written task, target checklist, and a clear distinction between “complete your practice” and “officially correct.” No AI request is needed to finish.
- Restarting retains the six-stage delivery order and selects a different approved variant within a stage when available. Switching task, level, or topic with unsaved production text prompts before clearing it. A page refresh may lose that draft in v1; this is stated rather than silently implying server save.

The question bank is bundled with the application, so there is no curriculum-service outage. A malformed or missing local entry is a deployment defect: fail closed for that path, log the ID server-side where possible, and show a generic unavailable message with a return-to-selection action. Never fall back to another task's topic or an AI-created replacement.

## Launch scope, quality gate, and success metric

The launch catalogue is intentionally **complete before broad**. Publish at least two complete six-stage paths for every Task × Level cell — 18 paths and 108 manually authored activities — using the canonical taxonomy above. To promise replay variety for a visible path, publish at least two reviewed variants for every stage in that path (12 activities per path, or 216 activities at the 18-path launch gate). Each variant must be reviewed by a qualified TCF educator for task fit, level calibration, answer accuracy, and explanation quality before its `published` flag is enabled. Additional taxonomy topics remain hidden until their full paths pass the same gate.

This is a meaningful first trainer without pretending that 216 activities complete the entire curriculum. It is preferred to seeding hundreds of thin or unreviewed items: the product promise is progressive writing practice, and a partial path breaks that promise more severely than a smaller menu.

The release succeeds in the first four weeks when:

1. at least **35%** of authenticated learners who open `/practice` start a path (baseline: unmeasured);
2. at least **45%** of started paths reach the `Produce` activity (baseline: unmeasured); and
3. a blinded TCF-qualified audit of the launch activities finds **0** task-mismatched topics, **0** required-stage coverage violations, and at least **95%** of closed-answer/explanation pairs pedagogically accurate.

Collect only selection, path start, stage reached, closed-answer correctness, retry, and path completion events after privacy review. Do not collect or transmit free-production text in the first release. The success metrics are targets until this minimal, privacy-reviewed instrumentation exists.

## Alternatives considered

**One shared skill list for all three tasks** — rejected. It creates irrelevant choices, hides the communicative differences between tasks, and encourages generic grammar content. Skill concepts that overlap are deliberately represented as task-specific paths.

**Generate an exercise from a topic with AI** — rejected. It violates the fixed-curriculum requirement, makes content quality and level calibration non-auditable, and adds a dependency to the moment when a learner needs immediate practice.

**Make every item an independent paragraph** — rejected. It measures a capability but does not provide varied rehearsal. Each selected topic instead has a reviewed progression of recognition, completion, transformation, organization, guided development, and production activities, with replay variety coming only from reviewed alternatives for the same stage.

**Shuffle the six exercise types on replay** — rejected. It can surface independent production before a learner has completed controlled practice, undermining the load-bearing controlled-to-independent learning path. Selecting an authored variant within each fixed stage gives variety without sacrificing the instructional sequence.

**Publish incomplete paths to make the catalogue look larger** — rejected. A learner selecting a named topic reasonably expects a complete learning progression. Two reviewed paths per Task × Level cell is an honest launch boundary; every other topic stays unpublished until complete.

**Persist all attempts and use them to adapt the next exercise now** — rejected for v1. It raises privacy, data-model, remediation, and algorithm-design requirements without proving that the curated path is engaging. Build trustworthy content and completion first; specify persistent progress separately if the launch metrics justify it.

## Open questions

- Who is the qualified TCF educator responsible for approving each path and recording the review decision/version?
- Should the first production activities offer an opt-in link into the existing correction workspace, or should that handoff wait until the two experiences have a shared, learner-safe context contract?
- Which interface locales need translated instructional copy at launch? French learning material remains French, but headings, controls, and explanations must follow the existing locale policy.

## Recommendation

Proceed with the task-owned taxonomy and a curated 18-path launch catalogue. The key tradeoff is more editorial work to author stage variants in exchange for every visible topic being comprehensive, task-relevant, reviewable, replayable without losing progression, and independent of AI generation. Treat the first launch as proof that learners will complete focused skill practice; expand breadth and persistent progress only after that evidence exists.
