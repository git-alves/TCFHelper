import { describe, expect, it } from "vitest";
import { classifyWritingContext } from "./guided-writing-classifier";

describe("classifyWritingContext", () => {
  it("always classifies Task 3 as argumentative analysis, deterministically", () => {
    expect(classifyWritingContext("TASK_3", "Peu importe le contenu.")).toEqual({
      profile: "ARGUMENTATIVE_ANALYSIS",
      confidence: "deterministic",
    });
  });

  it("classifies an informal Task 1 message to a friend", () => {
    expect(
      classifyWritingContext("TASK_1", "Écrivez un message à un ami pour lui raconter votre week-end."),
    ).toEqual({ profile: "INFORMAL_PERSONAL_MESSAGE", confidence: "deterministic" });
  });

  it("classifies a formal Task 1 letter to an institution", () => {
    expect(
      classifyWritingContext(
        "TASK_1",
        "Écrivez à Madame la Directrice de votre entreprise pour signaler un problème.",
      ),
    ).toEqual({ profile: "FORMAL_PROFESSIONAL_MESSAGE", confidence: "deterministic" });
  });

  it("classifies a message to a colleague as formal rather than offering a friendly salutation", () => {
    expect(
      classifyWritingContext("TASK_1", "Écrivez à un collègue pour le remercier de son aide sur un projet."),
    ).toEqual({ profile: "FORMAL_PROFESSIONAL_MESSAGE", confidence: "deterministic" });
  });

  it("asks for confirmation on an ambiguous Task 1 prompt", () => {
    expect(classifyWritingContext("TASK_1", "Décrivez un événement récent dans votre vie.")).toEqual({
      profile: "INFORMAL_PERSONAL_MESSAGE",
      confidence: "needs_confirmation",
    });
  });

  it("classifies a Task 2 article for readers", () => {
    expect(
      classifyWritingContext("TASK_2", "Rédigez un article pour le blog de votre association de quartier."),
    ).toEqual({ profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "deterministic" });
  });

  it("classifies a Task 2 letter addressed to a publication's readers", () => {
    expect(
      classifyWritingContext(
        "TASK_2",
        "Rédigez un courrier destiné aux lecteurs du journal de votre université.",
      ),
    ).toEqual({ profile: "PUBLIC_LETTER", confidence: "deterministic" });
  });
});
