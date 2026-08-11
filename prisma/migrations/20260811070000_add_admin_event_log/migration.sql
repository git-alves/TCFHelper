-- A bounded, owner-only operational ledger. It is intentionally isolated
-- from product ownership tables: logs must never cascade-delete a learner's
-- work, and a user/essay may disappear before its short-lived event does.
CREATE TABLE "AdminEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstOccurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "userId" TEXT,
    "essayId" TEXT,
    "accessCodeId" TEXT,
    "provider" TEXT,
    "reasonCode" TEXT,
    "httpStatus" INTEGER,
    "quotaWindow" TEXT,
    "usageValue" INTEGER,
    "quotaLimit" INTEGER,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "dedupeKey" TEXT,

    CONSTRAINT "AdminEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminEvent_id_check" CHECK ("id" ~ '^c[a-z0-9]{24}$'),
    CONSTRAINT "AdminEvent_severity_check" CHECK ("severity" IN ('INFO', 'WARN', 'ERROR')),
    CONSTRAINT "AdminEvent_module_check" CHECK ("module" IN ('ESSAY_SERVICE', 'QUOTA_ACCESS', 'AUTH_SECURITY', 'SYSTEM_INTEGRATION')),
    CONSTRAINT "AdminEvent_eventType_check" CHECK ("eventType" IN (
        'ACCESS_CODE_REDEEMED',
        'ACCESS_CODE_REJECTED',
        'TRANSLATION_QUOTA_DENIED',
        'EXAMPLE_QUOTA_DENIED',
        'CORRECTION_QUOTA_DENIED',
        'CORRECTION_PROVIDER_FAILED',
        'EXAMPLE_PROVIDER_FAILED',
        'TRANSLATION_PROVIDER_FAILED'
    )),
    CONSTRAINT "AdminEvent_provider_check" CHECK ("provider" IS NULL OR "provider" IN ('gemini', 'deepl', 'unofficial', 'deepl_or_unofficial')),
    CONSTRAINT "AdminEvent_reasonCode_check" CHECK ("reasonCode" IS NULL OR "reasonCode" IN (
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
        'fallback_circuit_open',
        'provider_unavailable'
    )),
    CONSTRAINT "AdminEvent_httpStatus_check" CHECK ("httpStatus" IS NULL OR "httpStatus" BETWEEN 100 AND 599),
    CONSTRAINT "AdminEvent_quotaWindow_check" CHECK ("quotaWindow" IS NULL OR "quotaWindow" IN ('minute', 'day', 'month')),
    CONSTRAINT "AdminEvent_quotaSnapshot_check" CHECK (COALESCE(
        ("usageValue" IS NULL AND "quotaLimit" IS NULL) OR
        ("usageValue" >= 0 AND "quotaLimit" >= 0),
        FALSE
    )),
    CONSTRAINT "AdminEvent_opaqueReference_check" CHECK (
        ("userId" IS NULL OR "userId" ~ '^c[a-z0-9]{24}$') AND
        ("essayId" IS NULL OR "essayId" ~ '^c[a-z0-9]{24}$') AND
        ("accessCodeId" IS NULL OR "accessCodeId" ~ '^c[a-z0-9]{24}$')
    ),
    CONSTRAINT "AdminEvent_occurrenceCount_check" CHECK ("occurrenceCount" >= 1),
    CONSTRAINT "AdminEvent_timestampOrder_check" CHECK ("firstOccurredAt" <= "occurredAt"),
    CONSTRAINT "AdminEvent_dedupeKey_check" CHECK ("dedupeKey" IS NULL OR "dedupeKey" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "AdminEvent_closedShape_check" CHECK (COALESCE(
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
        )
    , FALSE))
);

CREATE UNIQUE INDEX "AdminEvent_dedupeKey_key" ON "AdminEvent"("dedupeKey");
CREATE INDEX "AdminEvent_occurredAt_id_idx" ON "AdminEvent"("occurredAt", "id");
CREATE INDEX "AdminEvent_severity_occurredAt_id_idx" ON "AdminEvent"("severity", "occurredAt", "id");
CREATE INDEX "AdminEvent_module_occurredAt_id_idx" ON "AdminEvent"("module", "occurredAt", "id");
CREATE INDEX "AdminEvent_userId_occurredAt_id_idx" ON "AdminEvent"("userId", "occurredAt", "id");
CREATE INDEX "AdminEvent_essayId_occurredAt_id_idx" ON "AdminEvent"("essayId", "occurredAt", "id");
