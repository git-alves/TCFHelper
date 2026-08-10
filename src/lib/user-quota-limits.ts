/**
 * The defaults applied when an administrator has not set a learner-specific
 * value. Keep these names aligned with UserQuotaOverride: null means use the
 * corresponding value below, while zero is an intentional disablement.
 */
export type UserQuotaLimits = {
  translationRequestsPerMinute: number;
  translationCharactersPerMinute: number;
  translationCharactersPerMonth: number;
  exampleGenerationsPerDay: number;
  correctionRequestsPerDay: number;
};

export const DEFAULT_USER_QUOTA_LIMITS: UserQuotaLimits = {
  translationRequestsPerMinute: 20,
  translationCharactersPerMinute: 20_000,
  translationCharactersPerMonth: 100_000,
  // This preserves the temporary generous default already in production.
  exampleGenerationsPerDay: 1_000,
  // Corrections are materially more expensive than a cached example. Ten
  // fresh reviews per UTC day gives normal study sessions room while keeping
  // a compromised learner account from exhausting the shared model budget.
  correctionRequestsPerDay: 10,
};

export type UserQuotaOverrideValues = {
  [K in keyof UserQuotaLimits]: number | null;
};

/**
 * Converts nullable persisted overrides into the effective limits used by a
 * quota transaction. A value of zero is deliberately retained: it is how an
 * administrator can suspend one API without blocking the learner entirely.
 */
export function resolveUserQuotaLimits(
  overrides: Partial<UserQuotaOverrideValues> | null | undefined,
): UserQuotaLimits {
  return {
    translationRequestsPerMinute:
      overrides?.translationRequestsPerMinute ?? DEFAULT_USER_QUOTA_LIMITS.translationRequestsPerMinute,
    translationCharactersPerMinute:
      overrides?.translationCharactersPerMinute ?? DEFAULT_USER_QUOTA_LIMITS.translationCharactersPerMinute,
    translationCharactersPerMonth:
      overrides?.translationCharactersPerMonth ?? DEFAULT_USER_QUOTA_LIMITS.translationCharactersPerMonth,
    exampleGenerationsPerDay:
      overrides?.exampleGenerationsPerDay ?? DEFAULT_USER_QUOTA_LIMITS.exampleGenerationsPerDay,
    correctionRequestsPerDay:
      overrides?.correctionRequestsPerDay ?? DEFAULT_USER_QUOTA_LIMITS.correctionRequestsPerDay,
  };
}
