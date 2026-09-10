import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LanguageToolNotConfiguredError,
  LanguageToolRequestError,
  checkFrenchText,
  mapLanguageToolMatches,
} from "@/lib/language-tool";

describe("mapLanguageToolMatches", () => {
  it("maps a spelling match", () => {
    const errors = mapLanguageToolMatches({
      matches: [
        {
          message: "Faute de frappe possible trouvée.",
          shortMessage: "Faute de frappe",
          offset: 8,
          length: 4,
          replacements: [{ value: "très" }, { value: "près" }],
          rule: { id: "FR_SPELLING_RULE", issueType: "misspelling", category: { id: "TYPOS", name: "Faute de frappe possible" } },
        },
      ],
    });

    expect(errors).toEqual([
      {
        offset: 8,
        length: 4,
        message: "Faute de frappe",
        replacements: ["très", "près"],
        category: "TYPOS",
        ruleId: "FR_SPELLING_RULE",
        severity: "misspelling",
      },
    ]);
  });

  it("maps a grammar match with a missing-word suggestion", () => {
    // Representative of what a self-hosted LanguageTool instance returns for
    // "Je suis content cette situation." -> "Je suis content de cette
    // situation." -- a grammar rule whose only replacement re-inserts the
    // missing preposition.
    const errors = mapLanguageToolMatches({
      matches: [
        {
          message: "Une préposition semble manquante ici.",
          offset: 15,
          length: 5,
          replacements: [{ value: "de cette" }],
          rule: { id: "FR_MISSING_PREPOSITION", issueType: "grammar", category: { id: "GRAMMAR" } },
        },
      ],
    });

    expect(errors).toEqual([
      {
        offset: 15,
        length: 5,
        message: "Une préposition semble manquante ici.",
        replacements: ["de cette"],
        category: "GRAMMAR",
        ruleId: "FR_MISSING_PREPOSITION",
        severity: "grammar",
      },
    ]);
  });

  it("maps multiple matches in the same sentence, preserving order", () => {
    const errors = mapLanguageToolMatches({
      matches: [
        { message: "A", offset: 0, length: 2, replacements: [], rule: { id: "A", category: { id: "TYPOS" } } },
        { message: "B", offset: 10, length: 3, replacements: [], rule: { id: "B", category: { id: "GRAMMAR" } } },
      ],
    });

    expect(errors.map((error) => error.ruleId)).toEqual(["A", "B"]);
  });

  it("caps replacements at 5 even when LanguageTool returns dozens", () => {
    const errors = mapLanguageToolMatches({
      matches: [
        {
          message: "Faute de frappe",
          offset: 0,
          length: 4,
          replacements: Array.from({ length: 40 }, (_, index) => ({ value: `option-${index}` })),
          rule: { id: "FR_SPELLING_RULE", category: { id: "TYPOS" } },
        },
      ],
    });

    expect(errors[0].replacements).toHaveLength(5);
    expect(errors[0].replacements[0]).toBe("option-0");
  });

  it("falls back to the full message when shortMessage is absent", () => {
    const errors = mapLanguageToolMatches({
      matches: [{ message: "Full explanation.", offset: 0, length: 1, rule: { id: "X" } }],
    });

    expect(errors[0].message).toBe("Full explanation.");
  });

  it("falls back to a generic message and category/ruleId when all are missing", () => {
    const errors = mapLanguageToolMatches({ matches: [{ offset: 0, length: 1 }] });

    expect(errors[0]).toEqual({
      offset: 0,
      length: 1,
      message: "Possible language issue detected.",
      replacements: [],
      category: "OTHER",
      ruleId: "UNKNOWN",
    });
  });

  it("drops malformed matches instead of throwing", () => {
    const errors = mapLanguageToolMatches({
      matches: [
        null,
        "not an object",
        { offset: -1, length: 2 },
        { offset: 0, length: 0 },
        { offset: "not a number", length: 2 },
        { offset: 0, length: 2, message: "kept" },
      ],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("kept");
  });

  it("drops a zero-length match (impossible from a real server, but defended anyway)", () => {
    // org.languagetool.rules.RuleMatch's own constructor throws
    // IllegalArgumentException whenever toPos <= fromPos, so a real
    // LanguageTool response can never contain length <= 0 -- including for
    // missing-word rules, which flag an adjacent word and replace it with a
    // longer phrase (e.g. French's ABSENCE_QUE turning "possible il" into
    // "possible qu'il", length 11) rather than a zero-width insertion point.
    expect(mapLanguageToolMatches({ matches: [{ offset: 5, length: 0, message: "x" }] })).toEqual([]);
  });

  it("maps a real self-hosted-shaped missing-word match (ABSENCE_QUE)", () => {
    // Verified against the live LanguageTool API for
    // "Il est possible il pleuve demain." -> "Il est possible qu'il pleuve
    // demain." -- offset/length cover "possible il", the existing text
    // ABSENCE_QUE replaces with a longer phrase that inserts "qu'".
    const errors = mapLanguageToolMatches({
      matches: [
        {
          message: "Une conjonction est probablement manquante.",
          offset: 7,
          length: 11,
          replacements: [{ value: "possible qu'il" }, { value: "possible, il" }],
          rule: { id: "ABSENCE_QUE", issueType: "grammar", category: { id: "GRAMMAR" } },
        },
      ],
    });

    expect(errors).toEqual([
      {
        offset: 7,
        length: 11,
        message: "Une conjonction est probablement manquante.",
        replacements: ["possible qu'il", "possible, il"],
        category: "GRAMMAR",
        ruleId: "ABSENCE_QUE",
        severity: "grammar",
      },
    ]);
  });

  it("returns an empty list for an empty or malformed payload", () => {
    expect(mapLanguageToolMatches({ matches: [] })).toEqual([]);
    expect(mapLanguageToolMatches({})).toEqual([]);
    expect(mapLanguageToolMatches(null)).toEqual([]);
    expect(mapLanguageToolMatches("not an object")).toEqual([]);
  });
});

describe("checkFrenchText", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("throws LanguageToolNotConfiguredError when LANGUAGETOOL_URL is unset", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "");

    await expect(checkFrenchText("Bonjour", new AbortController().signal)).rejects.toBeInstanceOf(
      LanguageToolNotConfiguredError,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts to <LANGUAGETOOL_URL>/v2/check with language=fr and the text", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "http://languagetool:8010/");
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ matches: [] }), { status: 200 }),
    );

    await checkFrenchText("Je suis tres content.", new AbortController().signal);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("http://languagetool:8010/v2/check");
    expect(init?.method).toBe("POST");
    const body = init?.body as URLSearchParams;
    expect(body.get("language")).toBe("fr");
    expect(body.get("text")).toBe("Je suis tres content.");
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it("sends the shared secret as a bearer token when LANGUAGETOOL_SHARED_SECRET is set", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "http://languagetool-proxy:8080");
    vi.stubEnv("LANGUAGETOOL_SHARED_SECRET", "sekret-value");
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({ matches: [] }), { status: 200 }));

    await checkFrenchText("Bonjour", new AbortController().signal);

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer sekret-value");
  });

  it("throws a LanguageToolRequestError carrying the status when LanguageTool responds with a non-2xx status", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "http://languagetool:8010");
    vi.mocked(global.fetch).mockResolvedValue(new Response("boom", { status: 500 }));

    let caught: unknown;
    try {
      await checkFrenchText("Bonjour", new AbortController().signal);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(LanguageToolRequestError);
    expect((caught as LanguageToolRequestError).status).toBe(500);
    expect((caught as Error).message).toMatch(/LanguageTool request failed \(500\)/);
  });

  it("resolves with the mapped matches on success", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "http://languagetool:8010");
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          matches: [
            {
              message: "Faute de frappe",
              offset: 8,
              length: 4,
              replacements: [{ value: "très" }],
              rule: { id: "FR_SPELLING_RULE", category: { id: "TYPOS" } },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const errors = await checkFrenchText("Je suis tres content.", new AbortController().signal);
    expect(errors).toEqual([
      {
        offset: 8,
        length: 4,
        message: "Faute de frappe",
        replacements: ["très"],
        category: "TYPOS",
        ruleId: "FR_SPELLING_RULE",
      },
    ]);
  });
});
