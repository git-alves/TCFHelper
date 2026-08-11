import { describe, expect, it } from "vitest";
import { AUTOMATIC_ADDITIVE_MIGRATIONS } from "./approved-additive-migrations";

describe("AUTOMATIC_ADDITIVE_MIGRATIONS", () => {
  it("allows the additive example-answer cache and quota migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260804180000_add_example_answer_cache_and_quota");
  });

  it("allows the correction-claim migration, approved for production", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260807120000_add_correction_claims");
  });

  it("allows the walkthrough-version migration, approved for production", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260810120000_add_walkthrough_version");
  });

  it("allows the additive single-owner database invariant", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260810140000_enforce_single_admin_owner");
  });

  it("allows the reviewed admin-access migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260810130000_add_admin_access_controls");
  });

  it("allows the additive activation-welcome state migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811020000_add_activation_welcome_state");
  });

  it("allows the additive access-code validity migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811050000_add_access_code_validity");
  });

  it("allows the additive user last-active migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811060000_add_user_last_active");
  });

  it("does not retain the removed topic-image migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).not.toContain("20260804160000_add_generated_topic_image");
  });
});
