import { NextResponse } from "next/server";
import { TaskType, TopicSource } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TASK_TYPES = Object.values(TaskType);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskType = searchParams.get("taskType");
  if (!taskType || !TASK_TYPES.includes(taskType as TaskType)) {
    return NextResponse.json({ error: "Invalid taskType." }, { status: 400 });
  }

  const topics = await prisma.topic.findMany({
    // A learner-supplied prompt is stored so its essay has durable context,
    // but it must never become visible in the shared seeded topic bank.
    where: {
      taskType: taskType as TaskType,
      source: TopicSource.OFFICIAL_EXAM,
    },
    select: { id: true, title: true, prompt: true },
  });

  // Small bank — shuffling in memory is simpler than a database-level
  // random ordering and keeps repeat pulls from feeling deterministic.
  const shuffled = [...topics].sort(() => Math.random() - 0.5);

  return NextResponse.json({ topics: shuffled });
}
