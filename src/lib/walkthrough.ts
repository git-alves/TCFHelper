// Bump this to re-show a revised walkthrough to every learner below the new
// version -- including ones who already completed or skipped an older one.
// No migration is needed for that: existing rows just read as "below
// current" again.
export const CURRENT_WALKTHROUGH_VERSION = 2;

export function shouldAutoStartWalkthrough(walkthroughCompletedVersion: number | null): boolean {
  return walkthroughCompletedVersion === null || walkthroughCompletedVersion < CURRENT_WALKTHROUGH_VERSION;
}

// A one-time handoff signal from the dashboard tour's last step to the tasks
// tour, for a manually re-triggered ("Take a tour") run by a learner who has
// already completed the current version -- shouldAutoStart alone is false
// for them on /tasks, so without this the manual tour would silently stop
// partway through instead of continuing into the task steps they were
// promised. Not used for the real first-time auto-start path, where both
// pages independently read shouldAutoStart as true.
export const WALKTHROUGH_CONTINUE_PARAM = "walkthrough";
export const WALKTHROUGH_CONTINUE_VALUE = "continue";
