# API Keys — compact model-chain redesign

## Goal

Make a rare-visit operational page answer three questions without making the owner scan a form: **What will run? Is there an action needed? What can I safely change?** The default is a readable operational overview; configuration appears only at the point of edit.

This proposal is scoped to `/admin/api-keys`, uses the existing Tailwind + React stack, and keeps the UI in English. `package.json` has no component library, so use accessible native controls (including `<details>` where noted) and existing local button/input styling; do not add one for this page.

## Diagnosis (observed on `origin/main`)

1. **Two configurations are shown for each job.** `AiSettingsSection` renders the legacy provider/key/model/limit form for both Essay correction and Example generation, while `ChainEditor` separately renders the chain (`admin-api-keys-form.tsx`, roughly lines 126–309 and 496–509). Once chains are enabled, the legacy controls are usually irrelevant but still consume the most space.
2. **Each chain step is an expanded mini-form.** Every one of up to three steps shows provider select, model input, password input, key removal, test, move up/down, and remove controls at once (lines 44–60). Two three-step chains therefore expose six password fields and many low-frequency actions before the owner has decided to change anything.
3. **Important status is disconnected from the thing it describes.** Chain alerts and both reserve-use counts appear as a small page-level block above all forms (lines 477–483), rather than on the relevant Correction/Examples card and step. The combined count makes a quick health check harder.
4. **The explanatory content precedes the working surface.** The page-level “Before you pick a model” box is a long, four-item rule set (`src/app/admin/api-keys/page.tsx`), even though normal visits are to inspect, swap, paste a key, or test. Model-format and correction-specific constraints are needed only while editing.
5. **Feedback is inconsistent.** Legacy single-provider Test has an inline, persistent success/error result with latency and target summary (lines 252–282); chain-step Test calls `window.alert` (lines 409–414). Alerts are interruptive, easy to lose, and do not identify a step in the page after dismissal.
6. **One distant Save action obscures pending work.** All edits save from one bottom button (lines 511–523). With a long chain, a rare visitor cannot easily tell which section changed or whether a change was saved.

## Proposed structure

### Page order

1. Header: **API Keys** and one-sentence purpose. Replace the permanent help box with a compact **“Model requirements & key precedence”** `<details>` immediately below it, closed by default. It contains the existing four facts, shortened and grouped by task. This is appropriate disclosure: it explains rules but is not live operational status.
2. A **visible, page-wide Attention** region only when alerts exist. It must never be inside a collapsed disclosure. Each alert names its job, step, provider/model, problem, and next action; dismissal remains available but is secondary.
3. Two equal **job status cards**: Essay correction, then Example generation. Each card is a complete at-a-glance unit.
4. A sticky-on-wide / normal-flow-on-mobile Save bar appears only after a change: `Unsaved changes in: Essay correction` + **Save changes** + **Discard changes**. It avoids a permanent distracting control and makes state explicit.

### Default card: visible at a glance

For a chain, show a compact ordered list, not inputs:

- A status line: `Active model chain · 3 steps` and either `No current alerts` or the relevant visible alert(s). Do **not** call it “Healthy”: the present data only provides alerts and reserve usage, not continuous health checks.
- Rows labeled **1 Primary**, **2 Reserve**, **3 Final reserve**. Each displays provider, model, and a muted credential source (`saved key ••••1234`, `environment key`, or `No key — will fail`). The current owner’s six models are therefore immediately comparable in their actual execution order.
- Per-card operational signal: `Reserve used today: 4` (or `None today`) and the existing `requests today / daily limit` progress bar. Keep the long definition of the count behind an info disclosure/tooltip; it is not a first-scan fact.
- Card actions: **Edit chain** and, per row, **Edit**. A small **Test** action may be offered per row; the result appears below that same row. There is intentionally no “Test all” in the first version: it turns a health check into up to three paid/limited real calls and collides with the existing rate limit.

With no chain, the card says `Single model (legacy)` with provider/model and key source, offers **Edit single model** and **Convert to model chain**. This preserves the current non-chain state rather than forcing a migration.

With a disabled/off chain, show `Model chain off — using single model` (not an empty card) and keep **Set up a model chain** prominent. A missing model/key is a visible warning, never hidden by an accordion.

### What disclosure is for

Use nested disclosure sparingly:

- **`<details>` for reference help** (closed): model compatibility, environment precedence, and daily-limit explanation. Native disclosure fits the project’s dependency-free approach; the repo already uses styled native `<details>/<summary>` in `correction-modal.tsx`.
- **An explicit edit mode for one card/step**, not three open accordions: clicking `Edit` replaces/expands only that row into its fields. Keep its summary (step number, provider, model) visible as the edit heading. `Edit chain` can open all steps only when restructuring is intentional.
- **Advanced / legacy settings** (closed) inside the card: daily request limit, legacy provider/key/model fields, `Turn off chain`, and “use environment default” / remove-saved-key controls. Show a short warning and confirmation before turning a chain off because it changes execution behavior.

Do not collapse alerts, missing configuration, the compact ordered chain, save/unsaved state, or a test result. Those are the owner’s operational facts, not optional detail.

## Low-fi wireframes

### Default view

```text
API Keys
Choose the models and credentials used by correction and examples.
[▸ Model requirements & key precedence]

! Attention (always visible)
  Essay correction · Step 3 · OpenRouter / nvidia/...:free
  Invalid key. [Edit step] [Dismiss]

┌ Essay correction                              Active model chain · 3 steps ┐
│ Used when grading submitted essays.  Reserve used today: 4                 │
│ Today: 82 / 1,000  ███░░░░░░░                                             │
│  1  Primary        Gemini Direct   gemini-3.5-flash-lite  env key [Edit]   │
│  2  Reserve        Gemini Direct   gemini-3.1-flash-lite  env key [Edit]   │
│  3  Final reserve  OpenRouter      nvidia/...:free     saved ••••8K2 [Edit]│
│                                      [Test step]                            │
│ [Edit chain]                                             [▸ Advanced]      │
└────────────────────────────────────────────────────────────────────────────┘

┌ Example generation                            Active model chain · 3 steps ┐
│ Used to generate a model answer.  Reserve used today: None                 │
│ ...same concise ordered list...                              [Edit chain] │
└────────────────────────────────────────────────────────────────────────────┘

                           Unsaved changes in: Essay correction
                                      [Discard]  [Save changes]
```

### Editing one step

```text
┌ Essay correction / Step 2 — Reserve                                  [Done]┐
│ Runs after Step 1 fails or is slow.                                      │
│ Provider   [Gemini Direct v]                                             │
│ Model      [gemini-3.1-flash-lite                                     ]  │
│ API key    [Paste replacement key (leave blank to keep env key)       ]  │
│            Using environment key. [Use saved key] [Remove saved key]     │
│ [Test this step]  Testing… / ✓ Connected in 421 ms                        │
│                    Tested Gemini Direct / gemini-3.1-flash-lite, env key  │
│ Order: [Move earlier] [Move later]     [Remove step]                       │
│ [Save changes]  [Cancel this edit]                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

`Cancel this edit` restores the row’s last saved/draft value, not the whole card. Changing provider immediately shows the existing consequence: a saved key for the previous provider cannot be reused; require a key or environment default before Save.

## Interaction and state details

- **Test:** `Test this step` disables only that step, says `Testing…`, and renders a persistent inline result directly under it. Reuse the current endpoint’s message, latency, and tested-target summary. Success is `role=status`; failure is `role=alert` with a plain recovery action (`Edit key`, `Try again`). Clear the result when that step changes so it cannot imply a different configuration was tested.
- **Save:** Any edit creates a visible dirty state immediately. Save keeps the existing one-request PUT and button disabled/labelled `Saving…`; on success, replace draft with the returned display and show `Saved just now`. On failure, retain every draft field, keep the save bar visible, and show the error next to it. Saving the two cards together is fine—there is already one endpoint—but label affected cards in the bar.
- **Reorder and removal:** In edit-chain mode, use labeled `Move earlier` / `Move later` buttons (with disabled boundary states) plus an accessible position announcement, rather than arrows alone. Removing a non-final step needs an inline confirmation/Undo because it may delete a saved key; do not let the chain become empty. `Add reserve step` remains capped at three and adds a visibly incomplete row that blocks Save until configured.
- **Off and empty:** Turning off a chain returns to the already supported legacy single-model fields under Advanced; confirm because it changes fallback behavior. A legacy section with no usable key/model is visibly `Not configured — requests will fail`, with the direct setup action.
- **Mobile:** Cards remain one column. A step’s summary wraps provider/model before its action buttons; actions are full-width or wrap with 44px minimum touch targets. The save bar is normal document flow below the changed card (not a viewport-covering sticky footer). Never rely on hover or only icon arrows.

## Implementation map and size

This is a front-end reorganization, not a backend redesign.

- Refactor `src/components/admin-api-keys-form.tsx`: make a `ModelJobCard`/compact chain summary the primary rendering; retain current draft state, `ChainStepForm`, max-three validation, `runTest`, `runChainStepTest`, alert dismissal, and the existing PUT payload. Replace the chain-step `window.alert` path with the existing inline `TestState` result UI, keyed by section + step.
- Move the long copy in `src/app/admin/api-keys/page.tsx` into a closed native `<details>` and move field-specific guidance beside its edit field.
- Use data already returned by `getAppConfigDisplay`: `correctionModelChain` / `exampleModelChain`, masked/saved-key indicators, section request counts, `modelChainStatus.alerts`, and `reserveToday`. The existing API already supports individual chain-step testing through `savedApiKeyIndex`.
- Preserve the legacy fields and current API contract (`/api/admin/api-keys` and `/test`) behind Advanced / the no-chain state. No database migration or API contract change is required.

**Chef estimate: M (roughly 2–4 focused implementation days including targeted component/route tests).** The UI is a material component-state refactor but does not need a backend change. Add **S** if the scope is limited to summary cards + per-step disclosure and inline chain-test results, leaving the global bottom save and legacy layout mostly intact.

### Backend work only if the owner wants stronger “health”

The current display can truthfully show unresolved key/credit alerts and reserve-use counts; it cannot prove a provider/model is currently reachable. A true last-checked/health badge, scheduled checks, or a cheap “Test all” policy would need new persisted status/telemetry and backend product decisions. Do not imply that capability in this UI without that work.

## Owner decisions (defaults proposed)

1. **Default:** retain a single global Save bar, but identify changed cards. Should saves instead be per-card? Per-card saves reduce blast radius but would require a clearer partial-save contract.
2. **Default:** keep daily request limit in Advanced. Is it still tuned often enough to deserve the card summary? If yes, show only `82 / 1,000 today` in the default card, not an editable field.
3. **Default:** show `No current alerts`, not “Healthy,” and offer individual real Test calls. Do you want future persisted health checks / a Test-all action? That is backend scope and may consume provider calls.
