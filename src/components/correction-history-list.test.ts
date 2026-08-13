import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { APP_COPY } from "@/lib/app-copy";
import type { CorrectionHistoryItem } from "@/lib/correction-history";
import {
  CorrectionHistoryEmpty,
  CorrectionHistoryList,
  CorrectionHistoryListContent,
} from "./correction-history-list";

describe("CorrectionHistoryList", () => {
  it("accepts only serializable records across the server/client boundary", () => {
    expectTypeOf<ComponentProps<typeof CorrectionHistoryList>>().toEqualTypeOf<{
      items: CorrectionHistoryItem[];
    }>();
  });

  it("links each owner-visible history item to its correction detail", () => {
    const markup = renderToStaticMarkup(
      createElement(CorrectionHistoryListContent, {
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
    expect(markup).toContain("Secure level: B2");
    expect(markup).toContain("A forum post");
    // The actions popover is closed by default (hidden, not unmounted, so it
    // stays covered by this static-render-only test setup) -- its trigger is
    // the only actions control visible without a click. It's a plain
    // disclosure, not role="menu"/"menuitem" -- see the comment at its
    // definition for why.
    expect(markup).toContain('aria-label="More options"');
    expect(markup).not.toContain("aria-haspopup");
    expect(markup).not.toContain('role="menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("View correction");
    expect(markup).toContain(">Delete<");
  });

  it("uses the dedicated no-history state instead of the progress-chart empty state", () => {
    const markup = renderToStaticMarkup(createElement(CorrectionHistoryEmpty, { copy: APP_COPY.en }));

    expect(markup).toContain("No corrections yet");
    expect(markup).toContain("Your corrected submissions will appear here.");
  });

  it("keeps the delete status live region outside the empty/non-empty branch, so it is never unmounted by that swap", () => {
    const nonEmptyMarkup = renderToStaticMarkup(
      createElement(CorrectionHistoryListContent, {
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
    const emptyMarkup = renderToStaticMarkup(
      createElement(CorrectionHistoryListContent, { locale: "en", copy: APP_COPY.en, items: [] }),
    );

    expect(nonEmptyMarkup).toContain('role="status"');
    expect(emptyMarkup).toContain('role="status"');
  });
});
