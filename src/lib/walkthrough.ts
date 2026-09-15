// Bump this to re-show a revised walkthrough to every learner below the new
// version -- including ones who already completed or skipped an older one.
// No migration is needed for that: existing rows just read as "below
// current" again.
export const CURRENT_WALKTHROUGH_VERSION = 5;

export function shouldAutoStartWalkthrough(walkthroughCompletedVersion: number | null): boolean {
  return walkthroughCompletedVersion === null || walkthroughCompletedVersion < CURRENT_WALKTHROUGH_VERSION;
}

// The shorter first-use guides stay on their own pages. This signal is only
// for the explicit, comprehensive "Take a tour" action: it starts on the
// Dashboard, then hands the learner through Practice and Full task.
export const FULL_WALKTHROUGH_PARAM = "walkthrough";
export const FULL_WALKTHROUGH_VALUE = "full";

// The full tour's overall step count, shared by the three runners
// (Dashboard, Practice, Tasks) that each show a slice of it via
// `progress={{ step, total }}` -- keeps their step-offset math (1, 6, 9)
// aimed at a single source of truth instead of three copies that could
// drift if a page's step count ever changes.
export const TOTAL_WALKTHROUGH_STEPS = 21;

export function isFullWalkthrough(value: string | null): boolean {
  return value === FULL_WALKTHROUGH_VALUE;
}
