import { describe, expect, it } from "vitest";
import { PracticeWalkthroughRunner } from "./practice-walkthrough-runner";

// See tasks-walkthrough-runner.test.ts for why this is a signature check
// rather than a render, and walkthrough-workspace-script.test.tsx for
// behavioral coverage of the step-blocking contract these runners consume.
describe("PracticeWalkthroughRunner", () => {
  it("takes no props from its server-page caller -- the full tour's auto-start is Dashboard's decision alone, reaching this page only via the walkthrough=full URL param", () => {
    expect(PracticeWalkthroughRunner.length).toBe(0);
  });
});
