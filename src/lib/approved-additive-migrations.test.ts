import { describe, expect, it } from "vitest";
import { AUTOMATIC_ADDITIVE_MIGRATIONS } from "./approved-additive-migrations";

describe("AUTOMATIC_ADDITIVE_MIGRATIONS", () => {
  it("allows the additive example-answer cache and quota migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260804180000_add_example_answer_cache_and_quota");
  });

  it("requires an explicit production decision for the correction-claim migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).not.toContain("20260807120000_add_correction_claims");
  });

  it("does not retain the removed topic-image migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).not.toContain("20260804160000_add_generated_topic_image");
  });
});
