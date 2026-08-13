import { describe, expect, it } from "vitest";
import { buildCorrectionSystemPrompt } from "./essay-correction-prompt";

const taskThreeTopicWithDocuments =
  "Faut-il interdire les téléphones portables à l'école ?\n\n" +
  "Document 1 :\nLes téléphones distraient les élèves.\n\n" +
  "Document 2 :\nLes téléphones sont des outils pédagogiques utiles.";

describe("buildCorrectionSystemPrompt", () => {
  it("includes the document-synthesis criteria for a Task 3 topic with real Document 1/2 sections", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_3", taskThreeTopicWithDocuments);

    expect(prompt).toContain("DOCUMENT COMPREHENSION");
    expect(prompt).not.toContain("does not present two opposing source documents");
  });

  it("swaps in a fully separate documentless rubric for a custom Task 3 topic with no source documents", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_3", "Le télétravail devrait-il être généralisé ?");

    expect(prompt).toContain("does not present two opposing source documents");
    // This must be a genuinely separate rubric, not the documents rubric with
    // a caveat prepended -- none of its document-comprehension criteria may
    // appear anywhere in the prompt, or the model still receives contradictory
    // instructions ("don't require this" followed by a section requiring it).
    expect(prompt).not.toContain("DOCUMENT COMPREHENSION");
    expect(prompt).not.toContain("COMPARISON / CONTRAST -- Where the task requires comparison");
    expect(prompt).not.toContain("SOURCE ACCURACY");
    expect(prompt).not.toContain("Document 1");
    expect(prompt).not.toContain("Understanding the documents");
    // The shared level calibration and CEFR-blocker guidance still applies.
    expect(prompt).toContain("ARGUMENTATIVE QUALITY");
    expect(prompt).toContain("CEFR BLOCKER");
  });

  it("never applies the Task 3 documentless rubric to other tasks", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.");

    expect(prompt).not.toContain("does not present two opposing source documents");
  });

  it("explicitly checks Tache 2's multi-recipient, narrative-plus-commentary format", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_2", "Racontez un voyage récent à vos collègues.");

    expect(prompt).toContain("several or general readers");
    expect(prompt).toContain("Recount the experience or event");
    expect(prompt).toContain("commentary, opinions, or arguments");
  });

  it("explicitly defines estimatedLevel/conservativeLevel as Demonstrated/Secure level, with ordering and a worked example", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.");

    expect(prompt).toContain('estimatedLevel ("Demonstrated level" to the student)');
    expect(prompt).toContain('conservativeLevel ("Secure level" to the student)');
    expect(prompt).toContain("conservativeLevel must never exceed estimatedLevel");
    expect(prompt).toContain("Worked example");
  });
});
