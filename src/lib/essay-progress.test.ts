import { describe, expect, it, vi } from "vitest";

const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));

// Next's bundler resolves this to a no-op via the "react-server" export
// condition; plain vitest doesn't set that condition, so the real package
// throws unconditionally on import. Mock it the same way for every module
// under test that carries the server-only marker.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { essay: { findMany: findManyMock } },
}));

import { EssayStatus } from "@prisma/client";
import { getEssayProgressPoints } from "./essay-progress";

describe("getEssayProgressPoints", () => {
  it("queries only submitted essays with an assessed level, for the given user", async () => {
    findManyMock.mockResolvedValue([]);

    await getEssayProgressPoints("learner_1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "learner_1",
          status: EssayStatus.SUBMITTED,
          feedback: { is: { level: { not: null } } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );
  });

  it("maps each row to a graph point with a derived, presentation-only CEFR rank", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "essay_1",
        taskType: "TASK_1",
        wordCount: 90,
        feedback: { level: "B2", meetsWordCount: true, createdAt: new Date("2026-08-01T00:00:00.000Z") },
      },
      {
        id: "essay_2",
        taskType: "TASK_2",
        wordCount: 130,
        feedback: { level: "C1", meetsWordCount: false, createdAt: new Date("2026-08-02T00:00:00.000Z") },
      },
    ]);

    const points = await getEssayProgressPoints("learner_1");

    expect(points).toEqual([
      {
        id: "essay_1",
        assessedAt: "2026-08-01T00:00:00.000Z",
        taskType: "TASK_1",
        cefrLevel: "B2",
        cefrRank: 4,
        wordCount: 90,
        meetsWordCount: true,
      },
      {
        id: "essay_2",
        assessedAt: "2026-08-02T00:00:00.000Z",
        taskType: "TASK_2",
        cefrLevel: "C1",
        cefrRank: 5,
        wordCount: 130,
        meetsWordCount: false,
      },
    ]);
  });

  it("skips a row that has no feedback or no assessed level, defensively", async () => {
    findManyMock.mockResolvedValue([
      { id: "essay_1", taskType: "TASK_1", wordCount: 90, feedback: null },
      {
        id: "essay_2",
        taskType: "TASK_1",
        wordCount: 90,
        feedback: { level: null, meetsWordCount: true, createdAt: new Date() },
      },
    ]);

    const points = await getEssayProgressPoints("learner_1");

    expect(points).toEqual([]);
  });
});
