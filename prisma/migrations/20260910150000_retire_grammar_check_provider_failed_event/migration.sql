-- Retires the closed-vocabulary event type/provider added for the
-- self-hosted LanguageTool grammar checker (20260909180000), which was
-- replaced by the bundled Hunspell spell checker the next day
-- (20260910100000) before GRAMMAR_CHECK_PROVIDER_FAILED/'languagetool' were
-- ever wired into a shipped, publicly reachable route. No application code
-- writes either value any more.
--
-- UNLIKE every other migration in this directory, this one is NOT purely
-- additive: it narrows the eventType/provider CHECK constraints, which
-- Postgres validates against every existing row when the constraint is
-- re-added. Do not add this migration to
-- src/lib/approved-additive-migrations.ts until an operator has confirmed
-- against the production AdminEvent table that no row has
-- eventType = 'GRAMMAR_CHECK_PROVIDER_FAILED' (equivalently, no row has
-- provider = 'languagetool') -- otherwise this ALTER TABLE fails outright,
-- or (if the retention cron has since purged the offending rows) simply
-- becomes safe to promote. AdminEvent rows expire after 30 days (see
-- purgeExpiredAdminEvents), so this can otherwise wait and be promoted once
-- that window has passed since 20260909180000 shipped.

ALTER TABLE "AdminEvent"
    DROP CONSTRAINT "AdminEvent_eventType_check",
    DROP CONSTRAINT "AdminEvent_provider_check",
    DROP CONSTRAINT "AdminEvent_closedShape_check";

ALTER TABLE "AdminEvent"
    ADD CONSTRAINT "AdminEvent_eventType_check" CHECK ("eventType" IN (
        'ACCESS_CODE_REDEEMED',
        'ACCESS_CODE_REJECTED',
        'TRANSLATION_QUOTA_DENIED',
        'EXAMPLE_QUOTA_DENIED',
        'CORRECTION_QUOTA_DENIED',
        'CORRECTION_PROVIDER_FAILED',
        'EXAMPLE_PROVIDER_FAILED',
        'TRANSLATION_PROVIDER_FAILED',
        'SPELL_CHECK_FAILED',
        'AUTH_SESSION_CREATED',
        'AUTH_NETWORK_REVIEW_REQUIRED'
    )),
    ADD CONSTRAINT "AdminEvent_provider_check" CHECK (
        "provider" IS NULL OR "provider" IN ('gemini', 'deepl', 'unofficial', 'deepl_or_unofficial', 'hunspell')
    );

ALTER TABLE "AdminEvent"
    ADD CONSTRAINT "AdminEvent_closedShape_check" CHECK (COALESCE(
        (
            (
                (
                    "eventType" = 'ACCESS_CODE_REDEEMED' AND
                    "severity" = 'INFO' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NOT NULL AND
                    "provider" IS NULL AND "reasonCode" IS NULL AND "httpStatus" = 200 AND
                    "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NULL AND
                    "searchText" = 'access code voucher activation redeemed success'
                ) OR (
                    "eventType" = 'ACCESS_CODE_REJECTED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "reasonCode" = 'invalid_or_spent' AND "httpStatus" = 400 AND
                    "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = 'access code voucher activation rejected invalid spent invalid or spent'
                ) OR (
                    "eventType" = 'TRANSLATION_QUOTA_DENIED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "httpStatus" = 429 AND
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
                    "provider" IS NULL AND "httpStatus" = 429 AND "dedupeKey" IS NOT NULL AND
                    (
                        ("reasonCode" = 'cooldown' AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL) OR
                        ("reasonCode" = 'daily_limit' AND "quotaWindow" = 'day' AND "usageValue" IS NOT NULL AND "quotaLimit" IS NOT NULL)
                    ) AND
                    "searchText" = ('example sample text generation quota rate limit denied ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'CORRECTION_QUOTA_DENIED' AND
                    "severity" = 'WARN' AND "module" = 'QUOTA_ACCESS' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IS NULL AND "reasonCode" = 'daily_limit' AND "httpStatus" = 429 AND
                    "quotaWindow" = 'day' AND "usageValue" IS NOT NULL AND "quotaLimit" IS NOT NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = 'essay correction quota daily limit denied daily limit'
                ) OR (
                    "eventType" = 'CORRECTION_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" = 'gemini' AND "reasonCode" IN (
                        'not_configured', 'rate_limited', 'transport_error', 'upstream_http_error', 'invalid_response', 'provider_unavailable'
                    ) AND "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('essay correction generation provider ai failed ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'EXAMPLE_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" = 'gemini' AND "reasonCode" IN (
                        'not_configured', 'rate_limited', 'transport_error', 'upstream_http_error', 'invalid_response', 'provider_unavailable'
                    ) AND "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('sample text example generation provider ai failed ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'TRANSLATION_PROVIDER_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" IN ('deepl', 'unofficial', 'deepl_or_unofficial') AND
                    "reasonCode" IN ('fallback_circuit_open', 'transport_error', 'provider_unavailable') AND
                    "httpStatus" IS NOT NULL AND "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
                    "dedupeKey" IS NOT NULL AND
                    "searchText" = ('translation generation provider failed ' || REPLACE("reasonCode", '_', ' '))
                ) OR (
                    "eventType" = 'SPELL_CHECK_FAILED' AND
                    "severity" = 'ERROR' AND "module" = 'ESSAY_SERVICE' AND
                    "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
                    "provider" = 'hunspell' AND "reasonCode" = 'provider_unavailable' AND
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
            "provider" IS NULL AND "reasonCode" IS NULL AND "httpStatus" IS NULL AND
            "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
            "maskedIp" IS NOT NULL AND "browserFamily" IS NOT NULL AND "deviceClass" IS NOT NULL AND
            "distinctIpCount" IS NULL AND "securityWindowMinutes" IS NULL AND
            "dedupeKey" IS NULL AND
            "searchText" = 'authentication sign in session started'
        ) OR (
            "eventType" = 'AUTH_NETWORK_REVIEW_REQUIRED' AND
            "severity" = 'WARN' AND "module" = 'AUTH_SECURITY' AND
            "userId" IS NOT NULL AND "essayId" IS NULL AND "accessCodeId" IS NULL AND
            "provider" IS NULL AND "reasonCode" IS NULL AND "httpStatus" IS NULL AND
            "quotaWindow" IS NULL AND "usageValue" IS NULL AND "quotaLimit" IS NULL AND
            "maskedIp" IS NULL AND "browserFamily" IS NULL AND "deviceClass" IS NULL AND
            "distinctIpCount" IS NOT NULL AND "securityWindowMinutes" = 10 AND
            "dedupeKey" IS NOT NULL AND
            "searchText" = 'authentication possible concurrent access review'
        )
    , FALSE));
