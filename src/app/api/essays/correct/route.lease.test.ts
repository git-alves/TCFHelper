// The claim lease against the real claim module (only the database is faked,
// in memory): a provider call that takes longer than the old 75 second lease
// must still be saved and charged once, and a second request meanwhile must be
// told when the first one's claim ends.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { gradeEssayMock, reserveCorrectionUsageMock, refundCorrectionUsageMock } = vi.hoisted(() => ({
  gradeEssayMock: vi.fn(),
  reserveCorrectionUsageMock: vi.fn(),
  refundCorrectionUsageMock: vi.fn(),
}));

type Lease = { claimToken: string; expiresAt: Date };
const leases = new Map<string, Lease>();
const essays: Array<{ id: string; [key: string]: unknown }> = [];

const leaseKey = (where: { userId_correctionKeyHash?: { userId: string; correctionKeyHash: string }; userId?: string; correctionKeyHash?: string }) => {
  const pair = where.userId_correctionKeyHash ?? { userId: where.userId!, correctionKeyHash: where.correctionKeyHash! };
  return `${pair.userId}:${pair.correctionKeyHash}`;
};

const tx = {
  $executeRaw: async () => 1,
  essay: {
    findFirst: async () => (essays[0] ? { id: essays[0].id } : null),
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const essay = { id: `essay_${essays.length + 1}`, ...data };
      essays.push(essay);
      return essay;
    },
  },
  topic: { create: async () => ({ id: "topic_custom" }) },
  correctionLease: {
    findUnique: async ({ where }: { where: Parameters<typeof leaseKey>[0] }) => leases.get(leaseKey(where)) ?? null,
    upsert: async ({ where, create }: { where: Parameters<typeof leaseKey>[0]; create: { claimToken: string; expiresAt: Date } }) => {
      leases.set(leaseKey(where), { claimToken: create.claimToken, expiresAt: create.expiresAt });
    },
    deleteMany: async ({ where }: { where: { userId: string; correctionKeyHash: string; claimToken: string } }) => {
      const lease = leases.get(leaseKey(where));
      if (lease?.claimToken === where.claimToken) leases.delete(leaseKey(where));
    },
  },
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: class extends Error {} }));
vi.mock("@/lib/activated-app-user", () => ({ getCurrentActivatedAppUser: async () => ({ id: "learner_1" }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    topic: {
      findUnique: async () => ({
        id: "topic_1",
        taskType: "TASK_1",
        source: "OFFICIAL_EXAM",
        prompt: "Écrivez un message à un ami.",
      }),
    },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  },
}));
vi.mock("@/lib/app-config", () => ({
  getAppConfig: async () => ({ correctionProvider: null, correctionApiKey: null, correctionModel: null }),
  resolveCorrectionProviderId: () => "gemini",
}));
vi.mock("@/lib/prompt-overrides", () => ({
  getPromptOverrides: async () => ({}),
  toCorrectionPromptOverrides: () => ({}),
}));
vi.mock("@/lib/correction-provider-registry", () => ({
  getCorrectionProvider: () => ({
    id: "gemini",
    hasConfiguredCredentials: () => true,
    gradeEssay: gradeEssayMock,
    resolveModel: () => "gemini-test",
  }),
}));
vi.mock("@/lib/correction-usage", () => ({
  reserveCorrectionUsage: reserveCorrectionUsageMock,
  refundCorrectionUsage: refundCorrectionUsageMock,
}));
vi.mock("@/lib/admin-events", () => ({ recordAdminEvent: vi.fn() }));

const { POST } = await import("./route");
const { LEASE_DURATION_MS } = await import("@/lib/correction-claim");

const feedback = {
  correctedText: "Bonjour.",
  modelVersion: "Bonjour.",
  scores: {
    content: { score: 60, feedback: "ok" },
    linguistics: { score: 70, feedback: "ok" },
    vocabulary: { score: 65, feedback: "ok" },
  },
  cefr: {
    estimatedLevel: "B1",
    conservativeLevel: "B1",
    confidence: "Medium",
    rationale: "r",
    evidence: "e",
    blocker: "b",
  },
  meetsWordCount: true,
  wordCountNote: "fine",
  errors: [],
  suggestions: ["s"],
  summary: "sum",
};

const SENTENCE = "Je vous écris pour vous parler de mon quartier, qui est très agréable et dans lequel il y a beaucoup de commerces.";
const CONTENT = Array.from({ length: 60 }, (_, index) => SENTENCE.split(" ")[index % 20]).join(" ");
const post = () =>
  POST(
    new Request("http://localhost/api/essays/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskType: "TASK_1", topicId: "topic_1", content: CONTENT, locale: "en" }),
    }),
  );

const START = new Date("2026-11-12T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  leases.clear();
  essays.length = 0;
  gradeEssayMock.mockReset();
  reserveCorrectionUsageMock.mockReset();
  refundCorrectionUsageMock.mockReset();
  reserveCorrectionUsageMock.mockResolvedValue({
    kind: "claimed",
    dayStartedAt: new Date("2026-11-12T00:00:00.000Z"),
    monthStartedAt: new Date("2026-11-01T00:00:00.000Z"),
  });
  // A provider that answers well, but only after a long overload backoff.
  gradeEssayMock.mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve(feedback), 100_000)),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("correction lease against a slow provider", () => {
  it("saves, and charges once, a correct answer that arrives after the old 75s lease would have expired", async () => {
    expect(LEASE_DURATION_MS).toBeGreaterThan(100_000);

    

    const pending = post();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100_000);
    const response = await pending;

    expect(response.status).toBe(200);
    expect(essays).toHaveLength(1);
    expect(reserveCorrectionUsageMock).toHaveBeenCalledTimes(1);
    expect(refundCorrectionUsageMock).not.toHaveBeenCalled();
    expect(leases.size).toBe(0);
  });

  it("tells a second request for the same correction when the first one's claim ends", async () => {
    const first = post();
    await vi.advanceTimersByTimeAsync(0);

    // 80s in: past the old lease, still inside the new one.
    await vi.advanceTimersByTimeAsync(80_000);
    const second = await post();

    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.code).toBe("CORRECTION_IN_PROGRESS");
    expect(body.retryAt).toBe(new Date(START.getTime() + LEASE_DURATION_MS).toISOString());
    // The second request neither called the provider nor reserved a slot.
    expect(gradeEssayMock).toHaveBeenCalledTimes(1);
    expect(reserveCorrectionUsageMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20_000);
    expect((await first).status).toBe(200);
    expect(essays).toHaveLength(1);
  });
});
