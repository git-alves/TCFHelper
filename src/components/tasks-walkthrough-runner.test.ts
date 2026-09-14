import { describe, expect, it } from "vitest";
import { TasksWalkthroughRunner } from "./tasks-walkthrough-runner";

// TasksWalkthroughRunner resolves copy via useAppCopy() itself (it's already
// client-only), so it can't be exercised with renderToStaticMarkup the way
// this repo's other component tests work -- useAppCopy()/useAppLocale()
// require a real AppLocaleProvider, which itself needs next/navigation's
// router, unavailable outside an actual Next.js render. See
// walkthrough-workspace-script.test.tsx for behavioral coverage of the
// step-blocking contract this component consumes.
describe("TasksWalkthroughRunner", () => {
  it("takes no props from its server-page caller -- the full tour's auto-start is Dashboard's decision alone, reaching this page only via the walkthrough=full URL param", () => {
    expect(TasksWalkthroughRunner.length).toBe(0);
  });
});
