import type { ComponentProps } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { TasksWalkthroughRunner } from "./tasks-walkthrough-runner";

// TasksWalkthroughRunner resolves copy via useAppCopy() itself (it's already
// client-only), so it can't be exercised with renderToStaticMarkup the way
// this repo's other component tests work -- useAppCopy()/useAppLocale()
// require a real AppLocaleProvider, which itself needs next/navigation's
// router, unavailable outside an actual Next.js render. This only locks in
// the one thing worth guarding here at the type level: the server page that
// mounts this passes nothing but a primitive boolean across the
// server/client boundary, the same class of mistake that caused the
// Dashboard RSC outage.
describe("TasksWalkthroughRunner", () => {
  it("accepts only a primitive shouldAutoStart prop from its server-page caller", () => {
    expectTypeOf<ComponentProps<typeof TasksWalkthroughRunner>>().toEqualTypeOf<{
      shouldAutoStart: boolean;
    }>();
  });
});
