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

export function isFullWalkthrough(value: string | null): boolean {
  return value === FULL_WALKTHROUGH_VALUE;
}
