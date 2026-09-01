import type { ComponentProps } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { PracticeWalkthroughRunner } from "./practice-walkthrough-runner";

describe("PracticeWalkthroughRunner", () => {
  it("accepts only a primitive shouldAutoStart prop from its server-page caller", () => {
    expectTypeOf<ComponentProps<typeof PracticeWalkthroughRunner>>().toEqualTypeOf<{
      shouldAutoStart: boolean;
    }>();
  });
});
