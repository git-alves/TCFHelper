import "server-only";

import { EssayStatus } from "@prisma/client";
import type { CefrLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EssayProgressPoint } from "@/lib/essay-progress-chart";

// Presentation-only ordering for plotting a categorical level on a numeric
// axis -- not a statistically meaningful score, and never persisted.
const CEFR_RANK: Record<CefrLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

/**
 * Every successful correction already creates an Essay + Feedback row (see
 * /api/essays/correct), so this reads existing history rather than deriving
 * or storing anything new. Only a submitted essay with an assessed level
 * counts as a graphable attempt -- a draft, or a correction call that failed
 * before a model response came back, never becomes one of these rows.
 */
export async function getEssayProgressPoints(userId: string): Promise<EssayProgressPoint[]> {
  const essays = await prisma.essay.findMany({
    where: {
      userId,
      status: EssayStatus.SUBMITTED,
      feedback: { is: { level: { not: null } } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      taskType: true,
      wordCount: true,
      feedback: { select: { level: true, meetsWordCount: true, createdAt: true } },
    },
  });

  const points: EssayProgressPoint[] = [];
  for (const essay of essays) {
    // The where clause above already filters to a non-null level; this
    // narrows the type Prisma still infers as nullable and defensively
    // skips a row a concurrent write could have changed since the query ran.
    if (!essay.feedback || !essay.feedback.level) continue;

    points.push({
      id: essay.id,
      assessedAt: essay.feedback.createdAt.toISOString(),
      taskType: essay.taskType,
      cefrLevel: essay.feedback.level,
      cefrRank: CEFR_RANK[essay.feedback.level],
      wordCount: essay.wordCount,
      meetsWordCount: essay.feedback.meetsWordCount,
    });
  }

  return points;
}
