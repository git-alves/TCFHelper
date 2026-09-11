"use client";

import { useAppCopy } from "@/components/app-locale-provider";
import { ProgressChart } from "@/components/progress-chart";
import type { EssayProgressPoint } from "@/lib/essay-progress-chart";

// A believable upward trend across the three TCF tasks, standing in for a
// learner's real history. This renders the same ProgressChart component the
// signed-in Dashboard uses, not a redrawn approximation of it, so the
// landing page shows the actual chart a learner will see rather than an
// invented mockup.
const SAMPLE_PROGRESS_POINTS: EssayProgressPoint[] = [
  { id: "t1-1", assessedAt: "2026-06-02T10:00:00.000Z", taskType: "TASK_1", cefrLevel: "B1", cefrRank: 3, wordCount: 68, meetsWordCount: true },
  { id: "t1-2", assessedAt: "2026-06-16T10:00:00.000Z", taskType: "TASK_1", cefrLevel: "B1", cefrRank: 3, wordCount: 72, meetsWordCount: true },
  { id: "t1-3", assessedAt: "2026-06-30T10:00:00.000Z", taskType: "TASK_1", cefrLevel: "B2", cefrRank: 4, wordCount: 75, meetsWordCount: true },
  { id: "t1-4", assessedAt: "2026-07-14T10:00:00.000Z", taskType: "TASK_1", cefrLevel: "B2", cefrRank: 4, wordCount: 78, meetsWordCount: true },
  { id: "t2-1", assessedAt: "2026-06-05T10:00:00.000Z", taskType: "TASK_2", cefrLevel: "A2", cefrRank: 2, wordCount: 24, meetsWordCount: true },
  { id: "t2-2", assessedAt: "2026-06-19T10:00:00.000Z", taskType: "TASK_2", cefrLevel: "B1", cefrRank: 3, wordCount: 27, meetsWordCount: true },
  { id: "t2-3", assessedAt: "2026-07-03T10:00:00.000Z", taskType: "TASK_2", cefrLevel: "B1", cefrRank: 3, wordCount: 30, meetsWordCount: true },
  { id: "t2-4", assessedAt: "2026-07-17T10:00:00.000Z", taskType: "TASK_2", cefrLevel: "B2", cefrRank: 4, wordCount: 29, meetsWordCount: true },
  { id: "t3-1", assessedAt: "2026-06-09T10:00:00.000Z", taskType: "TASK_3", cefrLevel: "B1", cefrRank: 3, wordCount: 118, meetsWordCount: true },
  { id: "t3-2", assessedAt: "2026-06-23T10:00:00.000Z", taskType: "TASK_3", cefrLevel: "B2", cefrRank: 4, wordCount: 126, meetsWordCount: true },
  { id: "t3-3", assessedAt: "2026-07-07T10:00:00.000Z", taskType: "TASK_3", cefrLevel: "B2", cefrRank: 4, wordCount: 129, meetsWordCount: true },
  { id: "t3-4", assessedAt: "2026-07-21T10:00:00.000Z", taskType: "TASK_3", cefrLevel: "B2", cefrRank: 4, wordCount: 131, meetsWordCount: true },
];

// Wrapped in `dark` so the chart's light/dark-aware borders and legend text
// (see ProgressChart/globals.css) render against this always-dark landing
// page the same way they do on the real Dashboard in dark mode, rather than
// picking up their light-mode grays.
export function DashboardPreview() {
  const copy = useAppCopy();

  return (
    <div className="dark mt-12 rounded-2xl border border-white/[.12] bg-black/30 p-6 shadow-2xl shadow-black/40 sm:p-8">
      <p className="text-sm font-medium text-zinc-400">{copy.dashboard.chartTitle}</p>
      <div className="mt-4">
        <ProgressChart points={SAMPLE_PROGRESS_POINTS} />
      </div>
    </div>
  );
}
