import type { ComponentProps } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { DashboardWalkthroughRunner } from "./dashboard-walkthrough-runner";

// See tasks-walkthrough-runner.test.ts for why this is a type-level check
// rather than a render: useAppCopy()/useAppLocale()/useRouter() all require
// context this repo's test setup can't provide.
describe("DashboardWalkthroughRunner", () => {
  it("accepts only a primitive shouldAutoStart prop from its server-page caller", () => {
    expectTypeOf<ComponentProps<typeof DashboardWalkthroughRunner>>().toEqualTypeOf<{
      shouldAutoStart: boolean;
    }>();
  });
});
