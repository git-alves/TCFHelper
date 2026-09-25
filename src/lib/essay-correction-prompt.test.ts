import { describe, expect, it } from "vitest";
import {
  DEFAULT_CORRECTION_BASE_PROMPT,
  DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT,
  DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT,
  DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS,
  buildCorrectionSystemPrompt,
} from "./essay-correction-prompt";

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

  it("scopes the sustained-control/consistency rules to conservativeLevel, not estimatedLevel", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.");

    expect(prompt).toContain("estimatedLevel may legitimately reflect a level demonstrated only occasionally");
    expect(prompt).toContain("do not suppress it to match conservativeLevel");
    expect(prompt).toContain("Do NOT set conservativeLevel to a higher level merely because");
    expect(prompt).toContain("these bullets constrain conservativeLevel only");
  });

  it("calibrates short-response consistency and gives C2 observable control markers", () => {
    const prompt = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.");

    expect(prompt).toContain('Scale what "consistently" requires to the length of text actually available');
    expect(prompt).toContain("60-180 words has little room to repeat any pattern many times over");
    expect(prompt).toContain("Do not downgrade conservativeLevel solely because a few sentences use ordinary vocabulary or simple connectors");
    expect(prompt).toContain("C2 is a matter of quality of control, not difficulty of vocabulary");
    expect(prompt).toContain("precise control of nuance and intent");
    expect(prompt).toContain("complex structures used naturally, without sounding forced");
    expect(prompt).toContain("a C2 text can and should still contain simple sentences");
    expect(prompt).toContain("occasional evidence still supports a C2 estimatedLevel");
  });

  it("keeps calibration review as an opt-in variant for a controlled prompt comparison", () => {
    const baseline = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.");
    const reviewed = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.", undefined, "calibration-review");

    expect(baseline).not.toContain("CALIBRATION REVIEW BEFORE FINALIZING");
    expect(reviewed).toContain("CALIBRATION REVIEW BEFORE FINALIZING");
    expect(reviewed).toContain("return only the requested JSON");
  });

  describe("admin prompt overrides", () => {
    it("uses each override in place of its corresponding built-in default block", () => {
      const prompt = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.", {
        base: "CUSTOM BASE {{feedbackLanguage}}.",
        task1: "CUSTOM TASK 1.",
      });

      expect(prompt).toBe("CUSTOM BASE English.\n\nCUSTOM TASK 1.");
    });

    it("substitutes the feedback-language token in a custom base prompt just like the default", () => {
      const prompt = buildCorrectionSystemPrompt("Français", "TASK_1", "Écrivez à votre voisin.", {
        base: "Respond in {{feedbackLanguage}} please.",
      });

      expect(prompt).toContain("Respond in Français please.");
      expect(prompt).not.toContain("{{feedbackLanguage}}");
    });

    it("falls back to the built-in default for a block left null/blank", () => {
      const prompt = buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin.", {
        base: null,
        task1: "   ",
      });

      expect(prompt).toBe(buildCorrectionSystemPrompt("English", "TASK_1", "Écrivez à votre voisin."));
    });

    it("picks the correct override for each Task 3 variant independently", () => {
      const overrides = { task3Documents: "CUSTOM WITH DOCS.", task3Documentless: "CUSTOM WITHOUT DOCS." };

      expect(
        buildCorrectionSystemPrompt("English", "TASK_3", taskThreeTopicWithDocuments, overrides),
      ).toContain("CUSTOM WITH DOCS.");
      expect(
        buildCorrectionSystemPrompt("English", "TASK_3", "Le télétravail devrait-il être généralisé ?", overrides),
      ).toContain("CUSTOM WITHOUT DOCS.");
    });

    it("never lets a Task 3 override leak into another task type", () => {
      const prompt = buildCorrectionSystemPrompt("English", "TASK_2", "Racontez un voyage récent à vos collègues.", {
        task3Documents: "CUSTOM WITH DOCS.",
        task3Documentless: "CUSTOM WITHOUT DOCS.",
      });

      expect(prompt).not.toContain("CUSTOM WITH DOCS.");
      expect(prompt).not.toContain("CUSTOM WITHOUT DOCS.");
    });

    it("exports a non-empty, token-bearing default for every editable block", () => {
      expect(DEFAULT_CORRECTION_BASE_PROMPT).toContain("{{feedbackLanguage}}");
      expect(DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_1.length).toBeGreaterThan(0);
      expect(DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_2.length).toBeGreaterThan(0);
      expect(DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT.length).toBeGreaterThan(0);
      expect(DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT.length).toBeGreaterThan(0);
    });
  });
});
