// Existing production databases can receive only migrations in this reviewed
// allowlist. Keep it separate from the deploy runner so the policy remains
// directly testable.
export const AUTOMATIC_ADDITIVE_MIGRATIONS = new Set([
  "20260729130000_subscription_status_and_event_ordering",
  "20260729140000_add_stripe_event_and_customer_index",
  "20260731170000_add_recent_exam_topic_provenance",
  "20260731200000_add_translation_quota",
  "20260801140000_add_translation_fallback_circuit",
  "20260801150000_add_user_clerk_id",
  "20260804180000_add_example_answer_cache_and_quota",
  "20260805220000_add_example_generation_lease_day",
  "20260806000000_add_example_generation_cooldown",
  "20260806010000_add_example_generation_attempt_cap",
  "20260807120000_add_correction_claims",
  "20260810120000_add_walkthrough_version",
  "20260810130000_add_admin_access_controls",
  "20260810140000_enforce_single_admin_owner",
  "20260811020000_add_activation_welcome_state",
  "20260811050000_add_access_code_validity",
  "20260811060000_add_user_last_active",
  "20260811070000_add_admin_event_log",
  "20260811080000_add_auth_security_sessions",
  "20260811090000_add_access_code_created_at_index",
  "20260811100000_add_access_code_expires_at",
  "20260813060000_add_topic_retired_at",
]);
