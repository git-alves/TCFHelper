// Bump this to re-show a revised walkthrough to every learner below the new
// version -- including ones who already completed or skipped an older one.
// No migration is needed for that: existing rows just read as "below
// current" again.
export const CURRENT_WALKTHROUGH_VERSION = 3;

export function shouldAutoStartWalkthrough(walkthroughCompletedVersion: number | null): boolean {
  return walkthroughCompletedVersion === null || walkthroughCompletedVersion < CURRENT_WALKTHROUGH_VERSION;
}
