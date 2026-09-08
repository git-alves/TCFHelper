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

  it("allows the empty, additive admin-event ledger migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811070000_add_admin_event_log");
  });

  it("allows the additive, short-lived auth-security session migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811080000_add_auth_security_sessions");
  });

  it("allows the additive access-code createdAt/id index migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811090000_add_access_code_created_at_index");
  });

  it("allows the additive access-code expiresAt migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260811100000_add_access_code_expires_at");
  });

  it("allows the additive Topic.retiredAt migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260813060000_add_topic_retired_at");
  });

  it("allows the additive Topic guide-context migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260826120000_add_topic_guide_context");
  });

  it("allows the additive Practice activity ledger", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260901190000_add_practice_progress");
  });

  it("allows the additive AppConfig singleton table", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260902120000_add_app_config");
  });

  it("allows the additive AppConfig daily-limit columns", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260902150000_add_app_config_daily_limits");
  });

  it("allows the additive private support-request ledger", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260903160000_add_support_requests");
  });

  it("allows the additive SupportRequest HubSpot sync-tracking columns", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260903180000_add_support_request_hubspot_sync");
  });

  it("allows the additive User.timezone migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260905160000_add_user_timezone");
  });

  it("does not retain the removed topic-image migration", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).not.toContain("20260804160000_add_generated_topic_image");
  });
});
