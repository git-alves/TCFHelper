-- Durable Practice activity is deliberately separate from Essay/Feedback:
-- exercises are fixed curated training material, not submitted full-task
-- responses. This additive ledger lets a Dashboard count learner activity
-- across browsers while preserving whether an exercise was self-completed or
-- resolved after its reviewed answer was revealed.
CREATE TYPE "PracticeLevel" AS ENUM ('B2', 'C1', 'C2');

CREATE TYPE "PracticeCompletionMethod" AS ENUM ('CORRECT', 'SELF_REVIEW', 'REVEALED');

CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "targetLevel" "PracticeLevel" NOT NULL,
    "skillId" TEXT NOT NULL,
    "exerciseIds" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeExerciseCompletion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseType" TEXT NOT NULL,
    "completionMethod" "PracticeCompletionMethod" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeExerciseCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeExerciseCompletion_sessionId_exerciseId_key"
    ON "PracticeExerciseCompletion"("sessionId", "exerciseId");

CREATE INDEX "PracticeSession_userId_completedAt_idx"
    ON "PracticeSession"("userId", "completedAt");

CREATE INDEX "PracticeSession_userId_taskType_targetLevel_skillId_idx"
    ON "PracticeSession"("userId", "taskType", "targetLevel", "skillId");

CREATE INDEX "PracticeExerciseCompletion_completedAt_idx"
    ON "PracticeExerciseCompletion"("completedAt");

ALTER TABLE "PracticeSession"
    ADD CONSTRAINT "PracticeSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeExerciseCompletion"
    ADD CONSTRAINT "PracticeExerciseCompletion_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
