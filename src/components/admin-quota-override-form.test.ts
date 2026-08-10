import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { quotaOverrideFormValues } from "./admin-quota-override-form";

describe("quotaOverrideFormValues", () => {
  it("turns a deleted all-inherited override into blank inputs", () => {
    expect(quotaOverrideFormValues(null)).toEqual({
      translationRequestsPerMinute: "",
      translationCharactersPerMinute: "",
      translationCharactersPerMonth: "",
      exampleGenerationsPerDay: "",
      correctionRequestsPerDay: "",
    });
  });

  it("retains a zero override instead of rendering it as inherited", () => {
    expect(quotaOverrideFormValues({
      translationRequestsPerMinute: 0,
      translationCharactersPerMinute: null,
      translationCharactersPerMonth: null,
      exampleGenerationsPerDay: null,
      correctionRequestsPerDay: null,
    }).translationRequestsPerMinute).toBe("0");
  });
});
