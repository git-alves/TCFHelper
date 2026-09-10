# French spelling check

The writing editor offers an optional, inline French spelling check for TCF
Canada practice. It is a learning aid only: it does not score a TCF response
and it does not represent official TCF evaluation criteria.

## What it does — and does not do

- Flags individual French words that the bundled Hunspell dictionary does not
  recognise.
- Underlines a possible misspelling and offers up to five dictionary
  suggestions. The learner must choose a suggestion; nothing changes
  automatically.
- Does **not** check grammar, missing words, punctuation, style, or assign a
  TCF score. It never invents a correction with an AI model.

## Architecture and privacy

```
Browser editor --POST /api/spell-check--> Next.js backend + bundled French Hunspell dictionary
```

`nspell` is a JavaScript implementation compatible with Hunspell dictionaries
and `dictionary-fr` supplies the French dictionary data. Both packages run in
the application backend. There is no Docker service, API key, environment
variable, public endpoint, paid API, or outbound request for spell checking;
the learner’s draft stays within this application.

`POST /api/spell-check` accepts `{ "text": string }` and returns only:

```json
{
  "errors": [{
    "offset": 8,
    "length": 4,
    "message": "Possible spelling mistake.",
    "replacements": ["très"],
    "category": "TYPOS",
    "ruleId": "HUNSPELL_FR",
    "severity": "misspelling"
  }]
}
```

The 20,000-character request limit matches the editor. A response is capped at
100 potential misspellings and Hunspell generates suggestions for only the
first five plausible words (not arbitrary consonant runs), so malformed long
drafts cannot exhaust a server worker. The endpoint requires an activated
account, has an in-memory per-user rate limit, validates a strict payload, and
marks responses `private, no-store`.

## Editor flow

The **Spell check: Off** button begins off for every browser. Turning it on is
an explicit learner choice stored in that browser. After typing pauses for
650 ms, the editor checks the latest text. It cancels obsolete requests and
clears stale underlines before the next response lands.

The editor uses a same-font text mirror above the textarea so underlines align
with the actual draft. Offsets are JavaScript UTF-16 positions — the same
indexing used by `textarea.selectionStart` — so line breaks, accents, and
apostrophes such as `l'homme`, `qu'il`, `j'aime`, and `aujourd'hui` preserve
their positions. Applying a suggestion replaces only that word and restores
the caret immediately after the replacement.

If the bundled checker ever fails, the editor remains usable and shows a
temporary-unavailable message. A sanitized `SPELL_CHECK_FAILED` event with
provider `hunspell` appears in `/admin/logs`; it contains no learner draft or
exception text.

## Local development

No additional service is required. Install the project dependencies and start
the app normally:

```sh
npm install
npm run dev
```

Open `/tasks`, turn on **Spell check**, and type `Je suis tres content de cette
situaton.`. After a short pause, `tres` and `situaton` are underlined; choose a
suggestion to apply it.

## Test coverage

`src/lib/spell-check.test.ts` covers spelling mistakes, multiple mistakes,
accents, apostrophes, punctuation, empty text, long text, and the deliberate
absence of grammar/missing-word detection. Route, underline-segment, and
correction tests cover request validation, rate limits, error logging,
multiple underlines, applying a suggestion, and caret preservation.
