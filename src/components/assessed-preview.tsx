"use client";

import { useAppCopy } from "@/components/app-locale-provider";
import { RADAR_ANGLES, RADAR_AXIS_COLORS, RADAR_CENTER, getRadarPoint, getRadarPolygon } from "@/lib/radar-chart";

// Sample scores standing in for a learner's real result, in the same order
// as correction-modal.tsx's getLearningCriteria (content, linguistics,
// vocabulary) so the color/axis mapping matches the real "Global
// performance" figure exactly.
const SAMPLE_SCORES = [82, 74, 88];

// The real correction modal's "Global performance" radar + score list (see
// the Overview tab in correction-modal.tsx), reused verbatim with a sample
// score, so the "What you will work on" section shows the actual assessment
// a learner receives instead of an invented illustration.
export function AssessedPreview() {
  const copy = useAppCopy();
  const modalCopy = copy.workspace.correctionModal;
  const criteria = [
    { label: modalCopy.contentScoreLabel, score: SAMPLE_SCORES[0] },
    { label: modalCopy.linguisticsScoreLabel, score: SAMPLE_SCORES[1] },
    { label: modalCopy.vocabularyScoreLabel, score: SAMPLE_SCORES[2] },
  ];
  const overallScore = Math.round(SAMPLE_SCORES.reduce((total, score) => total + score, 0) / SAMPLE_SCORES.length);

  return (
    <figure className="mt-12 rounded-2xl border border-violet-400/25 bg-violet-400/[.06] p-4 sm:p-5">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-100">{modalCopy.globalPerformanceHeading}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">{modalCopy.scoreDisclosure}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-violet-200">{modalCopy.overallScore({ score: overallScore })}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">{modalCopy.overallScoreDescription}</p>
          <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-1">
            {criteria.map((criterion, index) => (
              <li key={criterion.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: RADAR_AXIS_COLORS[index] }} />
                  <span className="truncate text-zinc-200">{criterion.label}</span>
                </span>
                <strong className="shrink-0 text-zinc-200">{criterion.score}%</strong>
              </li>
            ))}
          </ul>
        </div>
        <div
          role="img"
          aria-label={modalCopy.overallScore({ score: overallScore })}
          className="mx-auto w-full max-w-[13rem] text-zinc-700"
        >
          <svg viewBox="0 0 200 200" className="h-auto w-full" aria-hidden="true">
            {[25, 50, 75, 100].map((level) => (
              <polygon
                key={level}
                points={getRadarPolygon([level, level, level])}
                fill="none"
                stroke="currentColor"
                strokeDasharray={level === 100 ? undefined : "3 3"}
                strokeWidth="1"
              />
            ))}
            {RADAR_ANGLES.map((_, index) => {
              const point = getRadarPoint(100, index);
              return <line key={index} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={point.x} y2={point.y} stroke="currentColor" strokeWidth="1" />;
            })}
            <polygon
              points={getRadarPolygon(criteria.map((criterion) => criterion.score))}
              fill="#7c3aed"
              fillOpacity="0.18"
              stroke="#7c3aed"
              strokeWidth="2"
            />
            {criteria.map((criterion, index) => {
              const point = getRadarPoint(criterion.score, index);
              return <circle key={criterion.label} cx={point.x} cy={point.y} r="4" fill={RADAR_AXIS_COLORS[index]} />;
            })}
            <text x={RADAR_CENTER} y={RADAR_CENTER + 8} fill="currentColor" textAnchor="middle" className="fill-white text-[26px] font-semibold">
              {overallScore}%
            </text>
          </svg>
        </div>
      </div>
    </figure>
  );
}
