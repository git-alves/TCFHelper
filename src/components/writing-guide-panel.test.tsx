import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GuideProfile, TaskType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { APP_COPY } from "@/lib/app-copy";
import { WritingGuidePanel } from "./writing-guide-panel";

function render(taskType: TaskType, profile: GuideProfile) {
  return renderToStaticMarkup(
    createElement(WritingGuidePanel, {
      taskType,
      topicMode: "recent",
      recentTopicContext: { profile, confidence: "deterministic" },
      customTopicPrompt: "",
      level: "B2",
      locale: "en",
      copy: APP_COPY.en,
    }),
  );
}

describe("WritingGuidePanel", () => {
  it("asks who the learner is writing to when opening Task 1", () => {
    const markup = render("TASK_1", "INFORMAL_PERSONAL_MESSAGE");

    expect(markup).toContain("Writing situation");
    expect(markup).toContain("Who are you writing to?");
    expect(markup).not.toContain("Formules à adapter à votre sujet");
    expect(markup).toContain("Verb tenses to consider");
  });

  it("asks for a text type and readership when opening Task 2", () => {
    const markup = render("TASK_2", "PUBLIC_ARTICLE_OR_NOTE");

    expect(markup).toContain("Writing situation");
    expect(markup).toContain("What type of text are you writing, and for which readers?");
    expect(markup).not.toContain("Formules à adapter à votre sujet");
  });

  it("starts Task 3 directly because its writing situation is fixed", () => {
    const markup = render("TASK_3", "ARGUMENTATIVE_ANALYSIS");

    expect(markup).not.toContain("Writing situation");
    expect(markup).toContain("Formules à adapter à votre sujet");
    expect(markup).toContain("Verb tenses to consider");
    expect(markup).toContain("Présent");
  });
});
