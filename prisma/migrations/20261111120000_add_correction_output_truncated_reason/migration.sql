-- Widens the AdminEvent closed vocabulary so a CORRECTION_PROVIDER_FAILED
-- row can record "output_truncated": the provider stopped at its output-token
-- limit (Gemini finishReason MAX_TOKENS, OpenRouter finish_reason "length"),
-- so the correction JSON was cut off. Until now that was logged as
-- "invalid_json", which hid a budget problem behind a model-quality one.
--
-- Purely a widening: every value that was valid stays valid (including the
-- retired "invalid_response" in the CORRECTION_PROVIDER_FAILED branch), so
-- re-adding the constraints validates every existing row without rewriting
-- any of them, and the still-live previous deployment, which never writes
-- the new value, is unaffected. EXAMPLE_PROVIDER_FAILED is deliberately not
-- widened: the example generator has no output that can fail this way.
ALTER TABLE "AdminEvent"
    DROP CONSTRAINT "AdminEvent_reasonCode_check",
    DROP CONSTRAINT "AdminEvent_closedShape_check";

ALTER TABLE "AdminEvent"
    ADD CONSTRAINT "AdminEvent_reasonCode_check" CHECK ("reasonCode" IS NULL OR "reasonCode" IN (
        'invalid_or_spent',
        'minute_request_limit',
        'minute_character_limit',
        'monthly_character_limit',
        'daily_limit',
        'cooldown',
        'not_configured',
        'rate_limited',
        'transport_error',
        'upstream_http_error',
        'invalid_response',
        'format_unsupported',
        'invalid_json',
        'schema_invalid',
        'output_truncated',
        'fallback_circuit_open',
        'provider_unavailable'
    ));

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
                        'not_configured', 'rate_limited', 'transport_error', 'upstream_http_error', 'invalid_response', 'format_unsupported', 'invalid_json', 'schema_invalid', 'output_truncated', 'provider_unavailable'
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
