import { describe, expect, it } from "vitest";
import { editDistanceWithinForTesting, isNearIdenticalDraft } from "./near-identical-draft";

// 400 characters of ordinary French, so 2% is 8 characters (7 edits allowed).
const BASE =
  "Bonjour Madame Dupont, je me permets de vous écrire afin de vous signaler un problème qui concerne notre immeuble. " +
  "Depuis plusieurs semaines, l'ascenseur ne fonctionne plus et les personnes âgées ont beaucoup de difficultés pour monter chez elles. " +
  "Je vous demande donc de bien vouloir faire intervenir un technicien dans les meilleurs délais. " +
  "Dans l'attente de votre réponse, veuillez agréer mes salutations distinguées.";

describe("isNearIdenticalDraft", () => {
  it("flags a single comma added, removed or changed", () => {
    expect(isNearIdenticalDraft(BASE, BASE.replace("Bonjour Madame", "Bonjour, Madame"))).toBe(true);
    expect(isNearIdenticalDraft(BASE, BASE.replace("semaines,", "semaines"))).toBe(true);
    expect(isNearIdenticalDraft(BASE, BASE.replace("distinguées.", "distinguées;"))).toBe(true);
  });

  it("flags a one-letter spelling fix and a changed capital", () => {
    expect(isNearIdenticalDraft(BASE, BASE.replace("immeuble", "immeubles"))).toBe(true);
    expect(isNearIdenticalDraft(BASE, BASE.replace("Dans l'attente", "dans l'attente"))).toBe(true);
  });

  it("flags several scattered small edits while they stay under the limit", () => {
    const edited = BASE.replace("Bonjour Madame", "Bonjour, Madame")
      .replace("semaines,", "semaines")
      .replace("donc de", "donc, de")
      .replace("réponse,", "réponse");
    expect(isNearIdenticalDraft(BASE, edited)).toBe(true);
  });

  it("does not flag an identical draft or a spacing-only difference", () => {
    expect(isNearIdenticalDraft(BASE, BASE)).toBe(false);
    expect(isNearIdenticalDraft(BASE, `${BASE.replace("Bonjour Madame", "Bonjour   Madame")}  `)).toBe(false);
  });

  it("does not flag a substantial rewrite", () => {
    const rewritten = BASE.replace("Dans l'attente de votre réponse, veuillez agréer mes salutations distinguées.", "Merci d'avance pour votre aide, et bonne journée à tous les résidents de la rue.");
    expect(isNearIdenticalDraft(BASE, rewritten)).toBe(false);
    expect(isNearIdenticalDraft(BASE, "Salut Marie, comment vas-tu aujourd'hui ? Moi, je vais très bien.")).toBe(false);
  });

  it("treats exactly 2% as a real change and anything under it as near-identical", () => {
    const hundredCharacters = "a".repeat(100);
    // 2% of 100 is 2 characters; the rule is strictly under, so 1 edit passes and 2 do not.
    expect(isNearIdenticalDraft(hundredCharacters, `${hundredCharacters.slice(0, 50)}b${hundredCharacters.slice(51)}`)).toBe(true);
    expect(isNearIdenticalDraft(hundredCharacters, `b${hundredCharacters.slice(1, 99)}b`)).toBe(false);
  });

  it("never flags a draft too short for even one edit to be under 2%", () => {
    expect(isNearIdenticalDraft("Bonjour.", "Bonjour,")).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isNearIdenticalDraft("", BASE)).toBe(false);
    expect(isNearIdenticalDraft(BASE, "   ")).toBe(false);
  });
});

function fullTableDistance(a: string, b: string): number {
  const table = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) table[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = Math.min(
        table[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        table[i - 1][j] + 1,
        table[i][j - 1] + 1,
      );
    }
  }
  return table[a.length][b.length];
}

// A small deterministic generator, so a failure reproduces.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("editDistanceWithin (banded)", () => {
  it("agrees with a plain full-table edit distance on random strings and limits", () => {
    const random = seeded(7);
    const alphabet = "abc"; // tiny alphabet: lots of ties and stale-cell opportunities
    const randomString = (length: number) =>
      Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");

    for (let round = 0; round < 600; round += 1) {
      const a = randomString(1 + Math.floor(random() * 30));
      const b = randomString(1 + Math.floor(random() * 30));
      const limit = 1 + Math.floor(random() * 8);
      const exact = fullTableDistance(a, b);

      expect(editDistanceWithinForTesting(a, b, limit), `${a} -> ${b} (limit ${limit})`).toBe(
        exact <= limit ? exact : null,
      );
    }
  });

  it("agrees on strings that differ by a few scattered edits", () => {
    const random = seeded(11);
    for (let round = 0; round < 200; round += 1) {
      const original = Array.from({ length: 60 }, () => "abcd"[Math.floor(random() * 4)]);
      const edited = [...original];
      for (let edit = 0; edit < 1 + Math.floor(random() * 5); edit += 1) {
        const position = Math.floor(random() * edited.length);
        const kind = Math.floor(random() * 3);
        if (kind === 0) edited[position] = "x";
        else if (kind === 1) edited.splice(position, 1);
        else edited.splice(position, 0, "y");
      }
      const a = original.join("");
      const b = edited.join("");
      const exact = fullTableDistance(a, b);

      expect(editDistanceWithinForTesting(a, b, 6)).toBe(exact <= 6 ? exact : null);
    }
  });
});

describe("near-identical comparison cost", () => {
  const unit = "Bonjour Madame Dupont, je me permets de vous écrire afin de vous signaler un problème qui concerne notre immeuble. ";
  const long = unit.repeat(Math.ceil(20000 / unit.length)).slice(0, 20000);
  const limit = Math.ceil(20000 * 0.02) - 1; // 399 edits allowed at 20,000 characters

  function scatteredEdits(count: number): string {
    const characters = long.split("");
    for (let k = 0; k < count; k += 1) {
      const position = Math.floor(((k + 0.5) * long.length) / count);
      characters[position] = characters[position] === "z" ? "y" : "z";
    }
    return characters.join("");
  }

  it("does work proportional to length x allowed edits, not length squared", () => {
    const stats = { cellWrites: 0 };

    const distance = editDistanceWithinForTesting(long, scatteredEdits(limit), limit, stats);

    expect(distance).not.toBeNull();
    // Each row writes at most its band (2 x limit + 1) plus one reset cell.
    expect(stats.cellWrites).toBeLessThanOrEqual(long.length * (2 * limit + 2));
    // A full table would be ~400 million cells.
    expect(stats.cellWrites).toBeLessThan((long.length * long.length) / 10);
  });

  it("stops early when a draft has clearly changed a lot", () => {
    const stats = { cellWrites: 0 };

    expect(editDistanceWithinForTesting(long, long.split("").reverse().join(""), limit, stats)).toBeNull();
    expect(stats.cellWrites).toBeLessThan(long.length * (2 * limit + 2));
  });

  it("handles a maximum-length draft with the most edits allowed within a coarse time budget", () => {
    // Worst case measured around 100-120 ms on a development machine; the
    // budget only catches a return to quadratic behaviour or similar blow-ups.
    const started = performance.now();
    expect(isNearIdenticalDraft(long, scatteredEdits(limit))).toBe(true);
    expect(isNearIdenticalDraft(long, scatteredEdits(limit + 50))).toBe(false);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("is effectively instant for a localized edit such as one comma", () => {
    const started = performance.now();
    expect(isNearIdenticalDraft(long, `${long.slice(0, 9000)},${long.slice(9000)}`)).toBe(true);
    expect(performance.now() - started).toBeLessThan(50);
  });
});
