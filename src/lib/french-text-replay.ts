import { measureFrenchText } from "@/lib/french-text-check";

/**
 * Replays already-accepted submissions through the French check to measure
 * its false-positive rate. Every stored essay was accepted before the gate
 * existed, so any essay it would now reject is a false positive by
 * construction -- a measured rate on real learners instead of on invented
 * samples. The summary carries counts, ids and numeric scores only; it never
 * contains submitted text.
 */
export interface ReplayEssay {
  id: string;
  taskType: string;
  wordCount: number;
  /** The CEFR level the stored correction assigned, if any. */
  level: string | null;
  content: string;
}

interface Tally {
  total: number;
  rejected: number;
}

export interface ReplayRejection {
  id: string;
  taskType: string;
  wordCount: number;
  level: string | null;
  reason: "script" | "language";
  latinLetterShare: number;
  frenchShare: number;
  distinctFrenchWords: number;
  strongestCompetitor: string | null;
  strongestCompetitorShare: number;
}

export interface ReplaySummary {
  total: number;
  rejected: number;
  rejectionRate: number;
  byReason: Record<"script" | "language", number>;
  byTaskType: Record<string, Tally>;
  byLevel: Record<string, Tally>;
  rejections: ReplayRejection[];
}

export function createFrenchReplay() {
  const tallies = { taskType: new Map<string, Tally>(), level: new Map<string, Tally>() };
  const byReason = { script: 0, language: 0 };
  const rejections: ReplayRejection[] = [];
  let total = 0;

  function bump(map: Map<string, Tally>, key: string, rejected: boolean) {
    const tally = map.get(key) ?? { total: 0, rejected: 0 };
    tally.total += 1;
    if (rejected) tally.rejected += 1;
    map.set(key, tally);
  }

  return {
    add(essay: ReplayEssay) {
      const measurement = measureFrenchText(essay.content);
      const rejected = !measurement.result.ok;
      total += 1;
      bump(tallies.taskType, essay.taskType, rejected);
      bump(tallies.level, essay.level ?? "none", rejected);
      if (measurement.result.ok) return;

      byReason[measurement.result.reason] += 1;
      rejections.push({
        id: essay.id,
        taskType: essay.taskType,
        wordCount: essay.wordCount,
        level: essay.level,
        reason: measurement.result.reason,
        latinLetterShare: round(measurement.latinLetterShare),
        frenchShare: round(measurement.frenchShare),
        distinctFrenchWords: measurement.distinctFrenchWords,
        strongestCompetitor: measurement.strongestCompetitor,
        strongestCompetitorShare: round(measurement.strongestCompetitorShare),
      });
    },
    summary(): ReplaySummary {
      return {
        total,
        rejected: rejections.length,
        rejectionRate: total === 0 ? 0 : round(rejections.length / total),
        byReason: { ...byReason },
        byTaskType: Object.fromEntries(tallies.taskType),
        byLevel: Object.fromEntries(tallies.level),
        rejections,
      };
    },
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
