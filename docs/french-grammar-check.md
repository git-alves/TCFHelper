# French grammar and spelling check

A lightweight, inline writing assistant for the essay editor (`/tasks`):
spelling, grammar, and (where LanguageTool's own rules find one)
missing-word issues are underlined as the learner types, with a
click/hover popup offering LanguageTool's own suggested fix.

This is a learning aid, not a scoring engine: it never assigns a TCF
Canada score, and LanguageTool's corrections are **not** the official TCF
evaluation criteria. A separate module handles CEFR-level correction and
grading (`/api/essays/correct`, Gemini-based) — this feature is unrelated
to that and does not affect it.

The entire stack is free and open-source at runtime. There is no OpenAI,
Claude, Gemini, Grammarly, QuillBot, or other paid/SaaS grammar API
anywhere in this feature, and it never calls the public
`api.languagetool.org` — only a self-hosted LanguageTool server the app
itself controls.

## Architecture

```
Browser (essay editor, GrammarCheckedEditor)
   | debounced POST { text }
   v
Next.js route handler  --  POST /api/language-check
   | POST /v2/check (language=fr)
   v
Self-hosted LanguageTool server (Docker)
```

- **Frontend** — `src/components/grammar-checked-editor.tsx` is a drop-in
  replacement for the essay `<textarea>` in
  `src/components/writing-workspace.tsx`. It debounces text changes
  (650ms, inside the requested 500-800ms window), calls
  `/api/language-check`, and renders underlines via a same-font "mirror"
  overlay stacked on top of the real, still fully editable textarea (see
  the comment at the top of that file for how the overlay avoids
  intercepting normal typing). A toggle button next to the editor lets the
  learner turn the checker on or off; the choice is remembered per browser
  (`localStorage`, via the same preference mechanism the workspace already
  uses for its guided-writing panel) and defaults to on.
- **Backend** — `src/app/api/language-check/route.ts` is the only place
  that talks to LanguageTool (`src/lib/language-tool.ts`). It requires a
  signed-in, activated account (same as every other writing-assistance
  endpoint), validates and length-limits the request body, applies a
  per-user rate limit (`src/lib/language-check-rate-limit.ts`), and returns
  only the fields the editor needs — never LanguageTool's raw response.
- **LanguageTool** — runs in Docker via `docker-compose.yml`, using the
  open-source [erikvl87/languagetool](https://github.com/Erikvl87/docker-languagetool)
  image (itself a build of the official
  [languagetool-org/languagetool](https://github.com/languagetool-org/languagetool)
  server). Language is always `fr`.

## Running it locally

1. Start LanguageTool:

   ```sh
   docker compose up -d languagetool
   ```

   This publishes it on `http://localhost:8010`. The first request after
   startup can take a few seconds while the French language model loads.

2. Set `LANGUAGETOOL_URL` in `.env` (see `.env.example`):

   ```
   LANGUAGETOOL_URL="http://localhost:8010"
   ```

3. Run the app as usual (`npm run dev`) and open `/tasks`. The "Grammar
   check" toggle above the essay editor is on by default.

If `LANGUAGETOOL_URL` is unset or the container isn't reachable, the
toggle and editor still render normally; `/api/language-check` returns a
503 (`LANGUAGE_CHECK_UNAVAILABLE`) and the editor shows a small inline
"temporarily unavailable" notice instead of throwing or blocking typing.

### Deploying alongside the app

If the app itself runs inside the same Docker network as LanguageTool
(rather than on the host, as in local dev), point `LANGUAGETOOL_URL` at
the internal service name instead of `localhost`:

```
LANGUAGETOOL_URL="http://languagetool:8010"
```

The LanguageTool container should stay on the internal network only —
there's no reason to publish its port publicly when every request already
goes through the backend API.

## `POST /api/language-check`

Request:

```json
{ "text": "Je suis tres content de cette situation." }
```

Response:

```json
{
  "errors": [
    {
      "offset": 8,
      "length": 4,
      "message": "Possible spelling mistake",
      "replacements": ["très", "après"],
      "category": "TYPOS",
      "ruleId": "FR_SPELLING_RULE",
      "severity": "misspelling"
    }
  ]
}
```

`offset`/`length` are UTF-16 code-unit positions — the same indexing a JS
string, a textarea's `selectionStart`, and LanguageTool's own Java-based
response already use. No conversion happens anywhere in this feature,
including across French apostrophes (`l'homme`, `qu'il`, `aujourd'hui`),
which are each a single UTF-16 code unit regardless of which apostrophe
character is used.

Other behavior:

- Empty or whitespace-only text returns `{ "errors": [] }` without calling
  LanguageTool.
- Text longer than 20,000 characters (matching the editor's own
  `maxLength`) is rejected with 400.
- A signed-in, activated account is required (401 otherwise); an
  in-memory, per-process sliding window (40 requests/minute/user) guards
  against abuse (429 `LANGUAGE_CHECK_RATE_LIMITED`).
- LanguageTool being unreachable or misconfigured returns 502/503 rather
  than ever falling back to a public API.

## Testing

- `src/lib/language-tool.test.ts` — mapping LanguageTool's raw response
  shape (including a real `fr` spelling-match fixture) to the app's clean
  format: multiple matches, capped replacement lists, missing fields,
  malformed matches, and the HTTP client itself.
- `src/lib/language-check-segments.test.ts` — turning matches into
  non-overlapping display segments: multiple errors in one sentence,
  adjacent/overlapping matches, out-of-range (stale) matches, and text
  containing French apostrophes and accents.
- `src/lib/apply-correction.test.ts` — applying a replacement and
  computing the resulting cursor position: start/middle/end of text,
  insertions (missing word) and deletions, accents, apostrophes, and line
  breaks.
- `src/lib/language-check-rate-limit.test.ts` — the sliding-window limiter.
- `src/app/api/language-check/route.test.ts` — the route's auth, validation,
  rate limiting, and error-mapping behavior end to end (with LanguageTool
  itself mocked).

Run everything with `npm test`.
