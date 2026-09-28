-- Adds a `model` column to AdminEvent so a CORRECTION_PROVIDER_FAILED or
-- EXAMPLE_PROVIDER_FAILED row records which resolved model string was
-- attempted, not just which provider (gemini/openrouter). Without this, a
-- schema_invalid or rate-limit failure can't be tied to a specific
-- candidate once the admin panel's model field has since changed -- exactly
-- the ambiguity that makes A/B testing candidate models unreliable.
--
-- `model` is deliberately NOT part of the exact-enum closed vocabulary the
-- other fields on this row use: an unbounded catalog of provider model
-- names isn't enumerable the way severity/module/eventType/provider/
-- reasonCode are. It is only length-bounded (AdminEvent_model_check),
-- consistent with this table's existing rule against persisting arbitrary
-- caller-supplied text -- CorrectionProvider/ExampleProvider.resolveModel
-- only ever returns the admin-configured AppConfig override or an env-var
-- default, never anything derived from a provider's response or a
-- learner's essay.
ALTER TABLE "AdminEvent" ADD COLUMN "model" TEXT;

ALTER TABLE "AdminEvent"
    ADD CONSTRAINT "AdminEvent_model_check" CHECK ("model" IS NULL OR (length("model") BETWEEN 1 AND 200));

-- Widens the AdminEvent closed-shape constraint: every branch other than
-- CORRECTION_PROVIDER_FAILED/EXAMPLE_PROVIDER_FAILED now requires "model" IS
-- NULL (unused there); those two branches leave "model" unconstrained here
-- (nullable -- e.g. a "not_configured" OpenRouter failure with no model set
-- at all -- or a bounded string, per AdminEvent_model_check above) and fold
-- it into their searchText formula so it becomes free-text searchable the
-- same way reasonCode already is.
ALTER TABLE "AdminEvent" DROP CONSTRAINT "AdminEvent_closedShape_check";

ALTER TABLE "AdminEvent"
    ADD CONSTRAINT "AdminEvent_closedShape_check" CHECK (COALESCE(
        (
            (
                (
                    "eventType" = 'ACCESS_CODE_REDEEMED' AND
                    "severity" = 'INFO' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NOT NULL AND
                    "provider" IS NULL AND "model" IS NULL AND "reasonCode" IS NULL AND "httpStatus" = 200 AND
                    "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NULL AND
                    "searchText" = 'access code voucher activation redeemed success'
                ) OR (
                    "eventType" = 'ACCESS_CODE_REJECTED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "model" IS NULL AND "reasonCode" = 'invalid_or_spent' AND "httpStatus" = 400 AND
                    "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = 'access code voucher activation rejected invalid spent invalid or spent'
                ) OR (
                    "eventType" = 'TRANSLATION_QUOTA_DENIED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "model" IS NULL AND "httpStatus" = 429 AND
                    "usageValue" IS NOT NULL AND "quotaLimit" IS NOT NULL AND "dedupeKey" IS NOT NULL AND
                    (
                        ("reasonCode" IN ('minute_request_limit', 'minute_character_limit') AND "quotaWindow" = 'minute') OR
                        ("reasonCode" = 'monthly_character_limit' AND "quotaWindow" = 'month')
                    ) AND
                    "searchText" = ('translation quota rate limit denied ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'EXAMPLE_QUOTA_DENIED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "model" IS NULL AND "httpStatus" = 429 AND "dedupeKey" IS NOT NULL AND
                    (
                        ("reasonCode" = 'cooldown' AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL) OR
                        ("reasonCode" = 'daily_limit' AND "quotaWindow" = 'day' AND "usageValue" IS NOT NULL AND "quotaLimit" IS NOT NULL)
                    ) AND
                    "searchText" = ('example sample text generation quota rate limit denied ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'CORRECTION_QUOTA_DENIED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "model" IS NULL AND "reasonCode" = 'daily_limit' AND "httpStatus" = 429 AND
                    "quotaWindow" = 'day' AND "usageValue" IS NOT NULL AND "quotaLimit" IS NOT NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = 'essay correction quota daily limit denied daily limit'
                ) OR (
                    "eventType" = 'CORRECTION_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IN ('gemini', 'openrouter') AND "reasonCode" IN (
                        'not_configured', 'rate_limited', 'transport_error', 'upstream_http_error', 'invalid_response', 'format_unsupported', 'invalid_json', 'schema_invalid', 'provider_unavailable'
                    ) AND "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('essay correction generation provider ai failed ' || REPLACE("reasonCode", '_', ' ') || CASE WHEN "model" IS NOT NULL THEN ' ' || "model" ELSE '' END)
                ) OR (
                    "eventType" = 'EXAMPLE_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IN ('gemini', 'openrouter') AND "reasonCode" IN (
                        'not_configured', 'rate_limited', 'transport_error', 'upstream_http_error', 'invalid_response', 'provider_unavailable'
                    ) AND "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('sample text example generation provider ai failed ' || REPLACE("reasonCode", '_', ' ') || CASE WHEN "model" IS NOT NULL THEN ' ' || "model" ELSE '' END)
                ) OR (
                    "eventType" = 'TRANSLATION_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IN ('deepl', 'unofficial', 'deepl_or_unofficial') AND "model" IS NULL AND
                    "reasonCode" IN ('fallback_circuit_open', 'transport_error', 'provider_unavailable') AND
                    "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('translation generation provider failed ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'GRAMMAR_CHECK_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" = 'languagetool' AND "model" IS NULL AND
                    "reasonCode" IN ('not_configured', 'transport_error', 'upstream_http_error', 'provider_unavailable') AND
                    "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('grammar check spelling languagetool provider failed ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'SPELL_CHECK_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" = 'hunspell' AND "model" IS NULL AND "reasonCode" = 'provider_unavailable' AND
                    "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = 'spell check hunspell dictionary failed provider unavailable'
                )
            ) AND
            "maskedIp" IS NULL AND "browserFamily" IS NULL AND "deviceClass" IS NULL AND
            "distinctIpCount" IS NULL AND "securityWindowMinutes" IS NULL
        ) OR (
            "eventType" = 'AUTH_SESSION_CREATED' AND
            "severity" = 'INFO' AND "module" = 'AUTH_SECURITY' AND
            "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
            "provider" IS NULL AND "model" IS NULL AND "reasonCode" IS NULL AND "httpStatus" IS NULL AND
            "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
            "maskedIp" IS NOT NULL AND "browserFamily" IS NOT NULL AND "deviceClass" IS NOT NULL AND
            "distinctIpCount" IS NULL AND "securityWindowMinutes" IS NULL AND
            "dedupeKey" IS NULL AND
            "searchText" = 'authentication sign in session started'
        ) OR (
            "eventType" = 'AUTH_NETWORK_REVIEW_REQUIRED' AND
            "severity" = 'WARN' AND "module" = 'AUTH_SECURITY' AND
            "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
            "provider" IS NULL AND "model" IS NULL AND "reasonCode" IS NULL AND "httpStatus" IS NULL AND
            "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
            "maskedIp" IS NULL AND "browserFamily" IS NULL AND "deviceClass" IS NULL AND
            "distinctIpCount" IS NOT NULL AND "securityWindowMinutes" = 10 AND
            "dedupeKey" IS NOT NULL AND
            "searchText" = 'authentication possible concurrent access review'
        )
    , FALSE));
