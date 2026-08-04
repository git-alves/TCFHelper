CREATE TABLE "ExampleAnswer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskType" "TaskType" NOT NULL,
  "level" TEXT NOT NULL,
  "topicHash" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExampleAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExampleGenerationQuota" (
  "userId" TEXT NOT NULL,
  "dayStartedAt" TIMESTAMP(3) NOT NULL,
  "dailyRequestCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExampleGenerationQuota_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "ExampleGenerationLease" (
  "userId" TEXT NOT NULL,
  "taskType" "TaskType" NOT NULL,
  "level" TEXT NOT NULL,
  "topicHash" TEXT NOT NULL,
  "claimToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExampleGenerationLease_pkey" PRIMARY KEY ("userId", "taskType", "level", "topicHash")
);

CREATE UNIQUE INDEX "ExampleAnswer_userId_taskType_level_topicHash_key"
  ON "ExampleAnswer"("userId", "taskType", "level", "topicHash");
CREATE INDEX "ExampleAnswer_userId_idx" ON "ExampleAnswer"("userId");
CREATE INDEX "ExampleGenerationLease_expiresAt_idx" ON "ExampleGenerationLease"("expiresAt");

ALTER TABLE "ExampleAnswer"
  ADD CONSTRAINT "ExampleAnswer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExampleGenerationQuota"
  ADD CONSTRAINT "ExampleGenerationQuota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExampleGenerationLease"
  ADD CONSTRAINT "ExampleGenerationLease_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
