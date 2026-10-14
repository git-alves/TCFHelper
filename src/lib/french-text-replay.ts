import { measureFrenchText } from "@/lib/french-text-check";

/**
 * Replays already-accepted submissions through the French check to measure
 * its potential block rate on real learners. This is NOT the false-positive
 * rate: some stored essays may genuinely be non-French or arbitrary text. The
 * rejected sample is a candidate list for a privacy-safe manual review, and
 * only the legitimate French drafts that were blocked, divided by all
 * legitimate French drafts reviewed, give a false-positive rate. The summary
 * carries counts and numeric scores (plus ids, which the script only prints on
 * request); it never contains submitted text.
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
  /** Reminds every reader of the printed report what the rate means. */
  metric: "historical potential block rate (not a false-positive rate)";
  total: number;
  /** Stored essays the check would now block; not confirmed false positives. */
  potentialBlocks: number;
  potentialBlockRate: number;
  byReason: Record<"script" | "language", number>;
  byTaskType: Record<string, Tally>;
  byLevel: Record<string, Tally>;
  /** Linkable ids and scores; the script prints this only with --show-ids. */
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
        metric: "historical potential block rate (not a false-positive rate)",
        total,
        potentialBlocks: rejections.length,
        potentialBlockRate: total === 0 ? 0 : round(rejections.length / total),
        byReason: { ...byReason },
        byTaskType: Object.fromEntries(tallies.taskType),
        byLevel: Object.fromEntries(tallies.level),
        rejections,
      };
    },
  };
}

/**
 * What the script prints. Aggregate-only unless ids are explicitly requested,
 * because essay ids are linkable records that are easy to paste into tickets.
 */
export function formatReplayReport(summary: ReplaySummary, { showIds }: { showIds: boolean }): string {
  return JSON.stringify(showIds ? summary : { ...summary, rejections: undefined }, null, 2);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
