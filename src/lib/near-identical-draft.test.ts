import { describe, expect, it } from "vitest";
import { isNearIdenticalDraft } from "./near-identical-draft";

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

  it("stays fast on a maximum-length draft with scattered edits", () => {
    const long = BASE.repeat(Math.ceil(20000 / BASE.length)).slice(0, 20000);
    const started = performance.now();
    const edited = `${long.slice(0, 100)},${long.slice(100, 10000)}.${long.slice(10000)}`;
    expect(isNearIdenticalDraft(long, edited)).toBe(true);
    expect(isNearIdenticalDraft(long, long.split("").reverse().join(""))).toBe(false);
    expect(performance.now() - started).toBeLessThan(500);
  });
});
