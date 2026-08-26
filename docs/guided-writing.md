# Guided writing — prompt-aware, level-targeted coaching

**Problem** — A learner can be blocked before or during a TCF written-expression response even when they know the task’s word range. Generic advice by Tâche is insufficient: a message to a friend needs an informal opening such as `Salut [Prénom],`, while a letter to an institution needs a formal register. Learners also need advice calibrated to the performance level they are pursuing (B2, C1, or C2), without presenting generated text as a route to a guaranteed score.

**Job to be done** — When I am writing a response to this exact TCF prompt, help me choose an appropriate register and take the next useful step for my B2, C1, or C2 goal, while I remain in control of my answer.

## Goals / non-goals

### Goals

- Let a learner activate a non-modal Writing guide after selecting a task and providing a topic.
- Show short, French-language phrase examples and static idea prompts in task-aware stages, tailored to the selected target level: B2, C1, or C2. The stage sequence reflects the task rather than forcing every response into the same “Start / Develop / Finish” model.
- Tailor advice to the prompt’s writing situation: genre, intended audience, register, and communicative purpose. For example, an informal personal message can offer `Salut [Prénom],`; a formal letter can offer `Madame, Monsieur,` instead.
- Keep all guide content editorial, versioned, reviewable application data; no model request or generative AI is used to create or select tips.
- Require the learner to choose the writing situation before tips appear for every Tâche 1 and Tâche 2 prompt, including a trusted recent-exam topic. Tâche 3 has one fixed argumentative situation and may open directly.
- Persist only the learner’s preferred target level locally. The guide itself is closed by default for every newly selected task or replacement topic, and opens only after an explicit click.

### Non-goals

- No AI prompt interpretation, generated outlines, generated paragraphs, or real-time text analysis.
- No guarantee that following a guide earns B2, C1, or C2; it is practice coaching, not an official TCF assessment.
- No automatic inference of the learner’s current ability or automatic selection of a target level.
- No editing of guide copy through an admin UI in the first release.
- No attempt to rewrite the selected prompt or inject a topic-specific claim the learner did not choose.

## Decision

Build the guide from fixed content modules selected by two inputs:

1. **Target level** — learner-selected B2, C1, or C2.
2. **Writing context** — the selected topic’s genre, audience, register, and purpose.

This replaces the earlier task-only content proposal. Task type still determines required structure and word range, but it does not reliably determine tone: Tâche 1 alone can be a message to a friend or a professional colleague.

The app must not claim to understand arbitrary French text without AI. It may retain deterministic, auditable rules and stored editorial metadata for future curation, but these must not bypass learner choice. Every fresh Tâche 1 or Tâche 2 guide opening asks the learner to choose the writing situation before showing register- or genre-specific phrases. Learner choice is the source of truth for the current prompt/session.

Fixed content is preferred to an authorable database for v1 because it is a small, high-stakes pedagogical corpus: application review, translation completeness tests, and version control are more valuable than dynamic editing. The **topic context**, however, belongs with a topic where it is already known; it is data about the prompt rather than coaching prose.

## Product behavior

### Entry and selection flow

`Select task → select or paste topic → select target level → open Writing guide → choose the writing situation where needed → move through the task-specific stages → write`

- The Writing guide button is disabled until a non-empty topic is available. It appears adjacent to the editor heading and does not obscure the editor. It is closed by default; selecting a task, fetching a replacement recent-exam topic, or switching topic mode never opens it automatically.
- The first use defaults to **B2**; the learner may choose **B2**, **C1**, or **C2** at any time. The last selection is stored in local storage and visibly labels the guide, e.g. “Guide for C1.”
- The panel opens to the first task-specific stage and provides previous/next controls. The product must not infer the learner’s drafting stage from word count in v1. The stages are: Tâche 1 — **Open the message → Add useful details → Add an action or request (optional) → Check and finish**; Tâche 2 — **Set the format → Recount the experience → Comment / give a view → Add an argument → Nuance (optional) → Check and conclude**; Tâche 3 — **Frame the issue → Compare both documents → Take a position → Qualify it (optional) → Check and conclude**.
- Opening the guide for a Tâche 1 topic first presents “Writing situation — Who are you writing to?”. For Tâche 2 it asks “What type of text are you writing, and for which readers?” The learner selects one of the applicable profiles; the selection only applies to the current prompt/session. No potentially wrong salutation or phrase bank is shown before selection. Tâche 3 opens directly because its analytical situation is fixed.
- Changing task or topic closes the guide and clears the current context selection. The saved B2/C1/C2 preference remains.

### Writing-context profiles

The initial supported profiles are deliberately limited to situations represented by the TCF task set:

| Profile | Audience/register | Start-tip example |
| --- | --- | --- |
| `informal_personal_message` | friend, family, close contact; informal | `Salut [Prénom],` then say why you are writing. |
| `formal_professional_message` | employer, colleague, service, institution; formal | `Madame, Monsieur,` or an appropriate professional greeting, then state the purpose directly. |
| `public_article_or_note` | readers or a group; neutral/public | Give a clear title or opening idea that tells readers the subject. |
| `public_letter` | publication readers; formal-public | Address the readership appropriately, then state the issue and your purpose. |
| `argumentative_analysis` | no individual addressee; balanced, reasoned | Introduce the issue and signal that more than one viewpoint will be considered. |

The product does not expose a catch-all “formal” switch alone: genre changes the expected structure as well as the greeting. A learner can select a profile if the deterministic classifier cannot identify one.

### Content model

The guide content stays in a typed, static application module. It is composed from the topic context instead of being copied separately for every topic:

```ts
type TargetLevel = "B2" | "C1" | "C2";
type GuideStage =
  | "start"
  | "recount"
  | "develop"
  | "ask"
  | "addArgument"
  | "nuance"
  | "synthesize"
  | "position"
  | "finish";
type GuideProfile =
  | "informal_personal_message"
  | "formal_professional_message"
  | "public_article_or_note"
  | "public_letter"
  | "argumentative_analysis";

type TopicGuideContext = {
  profile: GuideProfile;
  confidence: "editorial" | "deterministic" | "needs_confirmation";
};

type GuidedWritingContent = Record<
  GuideProfile,
  Record<TargetLevel, Partial<Record<GuideStage, readonly string[]>>>
>;
```

Each stage pairs two elements: a compact, no-AI **“What can you say?”** question that helps an empty-page learner generate their own content, and a small French phrase bank that demonstrates an appropriate move without supplying a paragraph. The **Finish** stage adds a visible completion checklist for task coverage, organization, register, and word range; it is not merely a bank of closing formulas. The individual phrase banks differ by level:

| Target | Calibration |
| --- | --- |
| B2 | Complete the task clearly, organize ideas logically, and use accurate familiar language. |
| C1 | Add nuanced reasoning, varied and controlled structures, precise linking, and an appropriate register throughout. |
| C2 | Aim for consistently natural, flexible, precise expression and stylistic control; do not use obscure vocabulary merely to appear advanced. |

The selected interface locale determines panel labels and explanatory copy. French openings and French writing examples remain in French because they are learning material. All content must have entries for every supported interface locale and be covered by the same completeness checks as other application copy.

### Context source and degraded behavior

| Topic path | Context source | If unavailable or uncertain |
| --- | --- | --- |
| Curated starter topic | Editorially assigned `TopicGuideContext`, stored with the topic definition and persisted with the topic. | Still ask the learner to select a Tâche 1/2 writing situation before showing phrases. |
| Recent-exam topic | Deterministic rules based only on explicit prompt wording, with an optional editorial override keyed to the immutable topic record. | Still ask the learner to select a Tâche 1/2 writing situation before showing phrases. |
| Pasted custom topic | Deterministic rules based only on explicit prompt wording. | Ask the learner to choose a profile for this writing session. |

No network dependency is introduced. If local storage is unavailable, use B2 for the current page and keep the guide usable; nothing blocks writing or correction. Writing-situation selection is always available for Tâches 1 and 2, so a context-rule failure is not an error state.

## Implementation boundaries and rollout

1. Define the static types, all localized content modules, and deterministic context rules with unit tests for informal, formal, public, and ambiguous prompts.
2. Add editorial context to every starter topic and an additive nullable context field to persisted `Topic` records. Preserve topic immutability: revised prompt/context pairs receive a new topic record rather than changing a topic attached to existing essays.
3. Return the trusted stored or derived context alongside a selected recent topic. For custom prompts, derive on the client only from the visible current prompt and retain any learner override in component state.
4. Add the accessible, non-modal guide to the writing workspace. It must work by keyboard, preserve editor focus, announce stage/context changes, and never cover the textarea. Make optional moves visibly optional so a learner does not mistake them for compulsory paragraphs.
5. Review all B2/C1/C2 advice with a qualified TCF educator before release. Verify that each opening, register recommendation, and task requirement is appropriate for its profile.

## Success metric

The release succeeds if, in the first four weeks after launch:

- at least **25%** of eligible writing sessions open the guide; and
- at least **70%** of guide-opened sessions retain the default or explicitly select a context without immediately changing it again, as a proxy for recognizably correct prompt classification; and
- a TCF-qualified review finds **zero** register-mismatched opening suggestions in a 30-topic stratified sample (all profiles, topic paths, and target levels).

The baseline for these metrics is currently unmeasured. Instrument only guide opened, target selected, context inferred/confirmed/overridden, stage viewed, and session completion; do not collect the learner’s draft text for guide analytics.

**Analytics follow-up** — No guided-writing event collection is included in the first implementation. The metrics above are product targets, not measured release evidence, until privacy-reviewed instrumentation for those aggregate events is approved and delivered. Do not claim the targets have been met before then.

## Alternatives considered

**Task-only tips** — rejected. They cannot distinguish `Salut [Prénom],` from `Madame, Monsieur,` inside the same Tâche and would teach incorrect register on a material share of prompts.

**Use an LLM to classify the prompt or create a custom opening** — rejected. It conflicts with the no-AI requirement, adds a network dependency and cost, and makes pedagogical advice variable and harder to audit.

**Store every tip in the database and build an editor now** — rejected for v1. It adds moderation, translation, publishing, and preview requirements before there is evidence that the guide is used. Static content is the simpler editable source of truth; an admin editor can follow only if content changes become operationally frequent.

**Automatically apply detected register/context** — rejected. Even an explicit audience can be pedagogically ambiguous, and a learner must understand why they see a formal or informal phrase bank. A single compact writing-situation choice on each fresh Tâche 1/2 guide opening is a deliberate friction that prevents the system from silently steering the response.

## Recommendation

Proceed with prompt-aware static guidance, not generic task tips. The key tradeoff is a small context taxonomy and confirmation interaction in exchange for trustworthy register advice without AI. Do not release a “C2” option until its content has been reviewed by a TCF-qualified educator; the credibility cost of sophisticated-sounding but inappropriate phrasing is higher than the benefit of an earlier label.
