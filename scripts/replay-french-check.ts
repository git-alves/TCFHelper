/**
 * Read-only: replays every stored essay through the French check and prints
 * how many it would now reject. Each stored essay was accepted before the gate
 * existed, so every rejection is a false positive -- this measures the real
 * rate on actual learners, which invented samples cannot.
 *
 * The output holds counts, essay ids and numeric scores. It never prints or
 * writes essay text. It only runs `findMany`; nothing is modified.
 *
 * Usage: npm run check:french-replay            (summary + rejected ids)
 *        npm run check:french-replay -- --counts (summary without the id list)
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { createFrenchReplay } from "../src/lib/french-text-replay";

const BATCH_SIZE = 200;
const countsOnly = process.argv.includes("--counts");

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
  console.log(JSON.stringify(countsOnly ? { ...summary, rejections: undefined } : summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
