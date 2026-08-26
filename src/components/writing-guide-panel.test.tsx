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
  it.each([
    ["TASK_1", "INFORMAL_PERSONAL_MESSAGE"],
    ["TASK_2", "PUBLIC_ARTICLE_OR_NOTE"],
  ] as const)("asks for a writing situation when opening %s", (taskType, profile) => {
    const markup = render(taskType, profile);

    expect(markup).toContain("Writing situation");
    expect(markup).toContain("Who are you writing to?");
    expect(markup).not.toContain("Formules à adapter à votre sujet");
  });

  it("starts Task 3 directly because its writing situation is fixed", () => {
    const markup = render("TASK_3", "ARGUMENTATIVE_ANALYSIS");

    expect(markup).not.toContain("Writing situation");
    expect(markup).toContain("Formules à adapter à votre sujet");
  });
});
