/**
 * Read-only: replays every stored essay through the French check and prints
 * how many it would now reject. This is the *potential block rate*, not the
 * false-positive rate: an essay accepted before the gate existed may still be
 * genuinely non-French or arbitrary text. To get a false-positive rate,
 * manually classify a privacy-safe subset of the rejected essays (legitimate
 * French / mixed / non-French); false positives are the legitimate French
 * drafts blocked, divided by all legitimate French drafts reviewed.
 *
 * By default the report is aggregate only: counts and rates by task type,
 * stored level and rejection reason. It never prints or writes essay text, and
 * it does not print essay ids, because ids are linkable records that are easy
 * to paste into tickets or chat. Pass --show-ids only when someone with
 * production-data access needs to investigate a specific essay; that adds the
 * id and numeric scores (still no text) of each rejected essay.
 *
 * It only runs `findMany`; nothing is modified.
 *
 * Usage: npm run check:french-replay                (aggregate report)
 *        npm run check:french-replay -- --show-ids  (adds rejected ids + scores)
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { createFrenchReplay, formatReplayReport } from "../src/lib/french-text-replay";

const BATCH_SIZE = 200;
const showIds = process.argv.includes("--show-ids");

async function main() {
  const prisma = new PrismaClient();
  const replay = createFrenchReplay();
  try {
    let cursor: string | undefined;
    for (;;) {
      const batch = await prisma.essay.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: {
          id: true,
          taskType: true,
          wordCount: true,
          content: true,
          feedback: { select: { level: true } },
        },
      });
      if (batch.length === 0) break;
      for (const essay of batch) {
        replay.add({
          id: essay.id,
          taskType: essay.taskType,
          wordCount: essay.wordCount,
          level: essay.feedback?.level ?? null,
          content: essay.content,
        });
      }
      cursor = batch[batch.length - 1].id;
    }
  } finally {
    await prisma.$disconnect();
  }

  const summary = replay.summary();
  console.log(formatReplayReport(summary, { showIds }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
