import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { APP_COPY } from "@/lib/app-copy";
import { CorrectionHistoryEmpty, CorrectionHistoryList } from "./correction-history-list";

describe("CorrectionHistoryList", () => {
  it("links each owner-visible history item to its correction detail", () => {
    const markup = renderToStaticMarkup(
      createElement(CorrectionHistoryList, {
        locale: "en",
        copy: APP_COPY.en,
        items: [
          {
            id: "essay_123",
            taskType: "TASK_2",
            wordCount: 135,
            createdAt: "2026-08-07T12:00:00.000Z",
            assessedAt: "2026-08-07T12:00:01.000Z",
            cefrLevel: "B2",
            meetsWordCount: true,
            topicTitle: "A forum post",
          },
        ],
      }),
    );

    expect(markup).toContain('href="/dashboard/history/essay_123"');
    expect(markup).toContain("Tâche 2");
    expect(markup).toContain("Estimated level: B2");
    expect(markup).toContain("A forum post");
    expect(markup).toContain("View correction");
  });

  it("uses the dedicated no-history state instead of the progress-chart empty state", () => {
    const markup = renderToStaticMarkup(createElement(CorrectionHistoryEmpty, { copy: APP_COPY.en }));

    expect(markup).toContain("No corrections yet");
    expect(markup).toContain("Your corrected submissions will appear here.");
  });
});
