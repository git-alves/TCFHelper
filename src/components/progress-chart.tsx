"use client";

import { useAppCopy } from "@/components/app-locale-provider";
import { groupEssayProgressByTask, type EssayProgressPoint } from "@/lib/essay-progress";

interface ProgressChartProps {
  points: EssayProgressPoint[];
}

// Enough attempts to show a real trend without the line becoming unreadable;
// only the most recent ones per task are plotted.
const MAX_ATTEMPTS_PER_TASK = 8;
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const TASK_COLORS: Record<string, string> = {
  TASK_1: "#3b82f6",
  TASK_2: "#ef4444",
  TASK_3: "#22c55e",
};

const CHART_WIDTH = 640;
const CHART_HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function xFor(index: number, maxAttempts: number) {
  if (maxAttempts <= 1) return PADDING.left + PLOT_WIDTH / 2;
  return PADDING.left + (index / (maxAttempts - 1)) * PLOT_WIDTH;
}

// Rank 1 (A1) plots at the bottom, rank 6 (C2) at the top.
function yFor(rank: number) {
  return PADDING.top + (1 - (rank - 1) / (CEFR_LEVELS.length - 1)) * PLOT_HEIGHT;
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
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={copy.dashboard.chartTitle}
        className="w-full"
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

        {series.map((task) => (
          <g key={task.taskType}>
            <polyline
              fill="none"
              stroke={TASK_COLORS[task.taskType]}
              strokeWidth={2}
              points={task.attempts.map((point, i) => `${xFor(i, maxAttempts)},${yFor(point.cefrRank)}`).join(" ")}
            />
            {task.attempts.map((point, i) => (
              <circle key={point.id} cx={xFor(i, maxAttempts)} cy={yFor(point.cefrRank)} r={4} fill={TASK_COLORS[task.taskType]} />
            ))}
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {series.map((task) => (
          <span key={task.taskType} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TASK_COLORS[task.taskType] }} />
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
