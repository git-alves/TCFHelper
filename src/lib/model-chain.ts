import "server-only";

import { prisma } from "@/lib/prisma";
import { isCorrectionProviderId, type CorrectionProviderId } from "@/lib/correction-provider";

export type ModelChainSection = "correction" | "example";
export interface ModelChainStep {
  provider: CorrectionProviderId;
  model: string | null;
  apiKey: string | null;
}

const MAX_STEPS = 3;
// The correction lease reserves 170s. Provider work has a 150s budget,
// leaving 20s for validation/persistence: step 1/2 are capped at 35s and
// the final step receives the remaining budget (up to its normal 45s attempt
// and its existing retry policy only when another full attempt still fits).
export const CORRECTION_CHAIN_BUDGET_MS = 150_000;
export const CORRECTION_RESERVE_STEP_TIMEOUT_MS = 35_000;
export const EXAMPLE_CHAIN_BUDGET_MS = 75_000;
export const EXAMPLE_RESERVE_STEP_TIMEOUT_MS = 18_000;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Parses only owner-configured storage; malformed old data safely acts absent. */
export function parseModelChain(value: unknown): ModelChainStep[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_STEPS) return null;
  const steps: ModelChainStep[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    if (typeof record.provider !== "string" || !isCorrectionProviderId(record.provider)) return null;
    const model = text(record.model);
    const apiKey = text(record.apiKey);
    // OpenRouter cannot use a blank model (unless an env default exists, which
    // the adapter handles); Gemini may use its default.
    steps.push({ provider: record.provider, model, apiKey });
  }
  return steps;
}

export function modelStepKey(step: ModelChainStep) {
  // Never include the key: the stable provider/model identity is sufficient
  // for clearing an alert after a later success.
  return `${step.provider}:${step.model ?? "default"}`;
}

export async function openModelChainAlert(section: ModelChainSection, step: ModelChainStep, status: number) {
  if (status !== 401 && status !== 403 && status !== 402) return;
  const kind = status === 402 ? "credits" : "key";
  await prisma.modelChainAlert.upsert({
    where: { section_stepKey: { section, stepKey: modelStepKey(step) } },
    create: { section, stepKey: modelStepKey(step), provider: step.provider, model: step.model ?? "default", kind },
    update: { provider: step.provider, model: step.model ?? "default", kind, dismissedAt: null },
  });
}

export async function clearModelChainAlert(section: ModelChainSection, step: ModelChainStep) {
  await prisma.modelChainAlert.deleteMany({ where: { section, stepKey: modelStepKey(step) } });
}

export async function getModelChainAdminStatus() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [alerts, reserve] = await Promise.all([
    prisma.modelChainAlert.findMany({ where: { dismissedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.modelChainReserveUse.groupBy({ by: ["section"], where: { createdAt: { gte: today } }, _count: { _all: true } }),
  ]);
  return { alerts, reserveToday: { correction: reserve.find((r) => r.section === "correction")?._count._all ?? 0, example: reserve.find((r) => r.section === "example")?._count._all ?? 0 } };
}

export async function dismissModelChainAlert(id: string) {
  await prisma.modelChainAlert.updateMany({ where: { id }, data: { dismissedAt: new Date() } });
}

export type ChainFailure = { error: unknown; status?: number; reasonCode: string };
export type ModelChainRunOptions<T> = {
  section: ModelChainSection;
  steps: ModelChainStep[];
  legacy: boolean;
  budgetMs: number;
  reserveStepTimeoutMs: number;
  normalAttemptTimeoutMs: number;
  isFallbackable: (error: unknown) => ChainFailure | null;
  invoke: (step: ModelChainStep, controls: { timeoutMs: number; retry503: boolean; totalBudgetMs: number }) => Promise<T>;
  onFailure: (step: ModelChainStep, failure: ChainFailure) => Promise<void>;
};

/**
 * Executes each configured step once. Only the last step may use the legacy
 * 503 retry policy, and only while its remaining slice can accommodate it.
 * Legacy configuration deliberately bypasses this helper at route level.
 */
export async function runModelChain<T>(options: ModelChainRunOptions<T>): Promise<{ value: T; step: ModelChainStep; reserve: boolean }> {
  const started = Date.now();
  let lastError: unknown;
  for (let index = 0; index < options.steps.length; index++) {
    const step = options.steps[index]!;
    const isLast = index === options.steps.length - 1;
    const elapsed = Date.now() - started;
    const remaining = Math.max(1, options.budgetMs - elapsed);
    const timeoutMs = isLast ? Math.min(options.normalAttemptTimeoutMs, remaining) : Math.min(options.reserveStepTimeoutMs, remaining);
    try {
      const value = await options.invoke(step, { timeoutMs, retry503: isLast, totalBudgetMs: remaining });
      void clearModelChainAlert(options.section, step).catch(() => undefined);
      if (index > 0) void prisma.modelChainReserveUse.create({ data: { section: options.section } }).catch(() => undefined);
      return { value, step, reserve: index > 0 };
    } catch (error) {
      lastError = error;
      const failure = options.isFallbackable(error);
      if (!failure) throw error;
      await options.onFailure(step, failure);
      if (failure.status) void openModelChainAlert(options.section, step, failure.status).catch(() => undefined);
      // A failure that is specifically a learner-input 400 is deliberately
      // not fallbackable by route classifiers, so it never reaches here.
    }
  }
  throw lastError;
}
