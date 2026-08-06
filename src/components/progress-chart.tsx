"use client";

import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { APP_LOCALE_INTL_TAGS } from "@/lib/app-locale";
import { groupEssayProgressByTask, type EssayProgressPoint, type EssayProgressSeries } from "@/lib/essay-progress-chart";

interface ProgressChartProps {
  points: EssayProgressPoint[];
}

// Enough attempts to show a real trend without the line becoming unreadable;
// only the most recent ones per task are plotted.
const MAX_ATTEMPTS_PER_TASK = 8;
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// Each task line and marker is distinguished by shape and dash pattern as
// well as color, and all three colors meet the 3:1 non-text contrast
// minimum against this chart's white/near-black backgrounds -- a learner
// with color-vision deficiency, or a low-vision learner relying on
// contrast, must still be able to tell the three lines apart.
const TASK_STYLES: Record<string, { color: string; dashArray?: string; marker: "circle" | "square" | "diamond" }> = {
  TASK_1: { color: "#2563eb", marker: "circle" },
  TASK_2: { color: "#dc2626", dashArray: "6 3", marker: "square" },
  TASK_3: { color: "#15803d", dashArray: "2 3", marker: "diamond" },
};

const CHART_WIDTH = 640;
const CHART_HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;
const MARKER_SIZE = 4;

function xFor(index: number, maxAttempts: number) {
  if (maxAttempts <= 1) return PADDING.left + PLOT_WIDTH / 2;
  return PADDING.left + (index / (maxAttempts - 1)) * PLOT_WIDTH;
}

// Rank 1 (A1) plots at the bottom, rank 6 (C2) at the top.
function yFor(rank: number) {
  return PADDING.top + (1 - (rank - 1) / (CEFR_LEVELS.length - 1)) * PLOT_HEIGHT;
}

function Marker({ shape, x, y, color }: { shape: "circle" | "square" | "diamond"; x: number; y: number; color: string }) {
  if (shape === "square") {
    return <rect x={x - MARKER_SIZE} y={y - MARKER_SIZE} width={MARKER_SIZE * 2} height={MARKER_SIZE * 2} fill={color} />;
  }
  if (shape === "diamond") {
    const d = MARKER_SIZE * 1.2;
    return <polygon points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`} fill={color} />;
  }
  return <circle cx={x} cy={y} r={MARKER_SIZE} fill={color} />;
}

function ProgressDataTable({ series }: { series: EssayProgressSeries[] }) {
  const copy = useAppCopy();
  const { locale } = useAppLocale();
  const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE_INTL_TAGS[locale], { dateStyle: "medium" });

  // The visual chart is decorative (aria-hidden below); this is the actual
  // data assistive technology reads, since color/position alone can't
  // convey a line chart's values.
  return (
    <table className="sr-only">
      <caption>{copy.dashboard.chartTitle}</caption>
      <thead>
        <tr>
          <th scope="col">{copy.dashboard.attemptAxisLabel}</th>
          <th scope="col">{copy.dashboard.levelAxisLabel}</th>
        </tr>
      </thead>
      <tbody>
        {series.map((task) =>
          task.attempts.map((point, i) => (
            <tr key={point.id}>
              <td>
                {copy.dashboard.taskLegend({ number: task.number })} — {dateFormatter.format(new Date(point.assessedAt))}{" "}
                (#{i + 1})
              </td>
              <td>{point.cefrLevel}</td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

export function ProgressChart({ points }: ProgressChartProps) {
  const copy = useAppCopy();
  const series = groupEssayProgressByTask(points, MAX_ATTEMPTS_PER_TASK);

  if (series.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[.08] p-8 text-center dark:border-white/[.145]">
        <p className="font-medium">{copy.dashboard.emptyTitle}</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{copy.dashboard.emptyDescription}</p>
      </div>
    );
  }

  const maxAttempts = Math.max(...series.map((task) => task.attempts.length));

  return (
    <div>
      <ProgressDataTable series={series} />

      {/* Scrolls horizontally instead of shrinking below a legible size: a
       * viewBox-scaled SVG stretched to a narrow phone's width would make
       * the axis/legend text too small to read rather than just narrower.
       * The minimum width matches CHART_WIDTH exactly so the SVG is never
       * scaled below 1:1 -- an 11-unit label stays at least 11 CSS px. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          aria-hidden="true"
          className="w-full"
          style={{ minWidth: CHART_WIDTH }}
        >
          {CEFR_LEVELS.map((level, i) => {
            const y = yFor(i + 1);
            return (
              <g key={level}>
                <line
                  x1={PADDING.left}
                  x2={CHART_WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                />
                <text x={PADDING.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor" opacity={0.6}>
                  {level}
                </text>
              </g>
            );
          })}

          {Array.from({ length: maxAttempts }, (_, i) => (
            <text
              key={i}
              x={xFor(i, maxAttempts)}
              y={CHART_HEIGHT - PADDING.bottom + 16}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              opacity={0.6}
            >
              {i + 1}
            </text>
          ))}

          {series.map((task) => {
            const style = TASK_STYLES[task.taskType];
            return (
              <g key={task.taskType}>
                <polyline
                  fill="none"
                  stroke={style.color}
                  strokeWidth={2}
                  strokeDasharray={style.dashArray}
                  points={task.attempts.map((point, i) => `${xFor(i, maxAttempts)},${yFor(point.cefrRank)}`).join(" ")}
                />
                {task.attempts.map((point, i) => (
                  <Marker key={point.id} shape={style.marker} x={xFor(i, maxAttempts)} y={yFor(point.cefrRank)} color={style.color} />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {series.map((task) => (
          <span key={task.taskType} className="flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden="true">
              <Marker shape={TASK_STYLES[task.taskType].marker} x={6} y={6} color={TASK_STYLES[task.taskType].color} />
            </svg>
            {copy.dashboard.taskLegend({ number: task.number })}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {copy.dashboard.chartCaption({ count: maxAttempts })}
      </p>
    </div>
  );
}
