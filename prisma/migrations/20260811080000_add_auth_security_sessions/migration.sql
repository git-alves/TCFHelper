-- Privacy-preserving, review-only Clerk session telemetry. Full network and
-- session identifiers are HMAC fingerprints in the private short-lived table;
-- AdminEvent receives only a closed safe display summary or review warning.

ALTER TABLE "AdminEvent"
    ADD COLUMN "maskedIp" TEXT,
    ADD COLUMN "browserFamily" TEXT,
    ADD COLUMN "deviceClass" TEXT,
    ADD COLUMN "distinctIpCount" INTEGER,
    ADD COLUMN "securityWindowMinutes" INTEGER;

ALTER TABLE "AdminEvent"
    DROP CONSTRAINT "AdminEvent_eventType_check",
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
        'AUTH_SESSION_CREATED',
        'AUTH_NETWORK_REVIEW_REQUIRED'
    )),
    ADD CONSTRAINT "AdminEvent_maskedIp_check" CHECK (
        "maskedIp" IS NULL OR
        "maskedIp" = 'Unavailable' OR
        "maskedIp" ~ '^([0-9]{1,3}[.]){3}[*]$' OR
        "maskedIp" ~ '^[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}::/48$'
    ),
    ADD CONSTRAINT "AdminEvent_browserFamily_check" CHECK (
        "browserFamily" IS NULL OR "browserFamily" IN (
            'Chrome', 'Edge', 'Firefox', 'Safari', 'Opera', 'Samsung Internet', 'Other browser'
        )
    ),
    ADD CONSTRAINT "AdminEvent_deviceClass_check" CHECK (
        "deviceClass" IS NULL OR "deviceClass" IN ('Desktop', 'Mobile', 'Tablet', 'Other device')
    ),
    ADD CONSTRAINT "AdminEvent_distinctIpCount_check" CHECK (
        "distinctIpCount" IS NULL OR "distinctIpCount" BETWEEN 3 AND 100
    ),
    ADD CONSTRAINT "AdminEvent_securityWindowMinutes_check" CHECK (
        "securityWindowMinutes" IS NULL OR "securityWindowMinutes" = 10
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

CREATE INDEX "AdminEvent_userId_eventType_occurredAt_id_idx"
    ON "AdminEvent"("userId", "eventType", "occurredAt", "id");

CREATE TABLE "AuthSecuritySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sessionFingerprint" TEXT NOT NULL,
    "ipFingerprint" TEXT,
    "alertBucketStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSecuritySession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuthSecuritySession_id_check" CHECK ("id" ~ '^c[a-z0-9]{24}$'),
    CONSTRAINT "AuthSecuritySession_userId_check" CHECK ("userId" ~ '^c[a-z0-9]{24}$'),
    CONSTRAINT "AuthSecuritySession_sessionFingerprint_check" CHECK ("sessionFingerprint" ~ '^v1:[a-f0-9]{64}$'),
    CONSTRAINT "AuthSecuritySession_ipFingerprint_check" CHECK (
        "ipFingerprint" IS NULL OR "ipFingerprint" ~ '^v1:[a-f0-9]{64}$'
    ),
    CONSTRAINT "AuthSecuritySession_alertOrder_check" CHECK (
        "alertBucketStartedAt" IS NULL OR "alertBucketStartedAt" <= "occurredAt"
    )
);

CREATE UNIQUE INDEX "AuthSecuritySession_sessionFingerprint_key"
    ON "AuthSecuritySession"("sessionFingerprint");
CREATE UNIQUE INDEX "AuthSecuritySession_userId_alertBucketStartedAt_key"
    ON "AuthSecuritySession"("userId", "alertBucketStartedAt");
CREATE INDEX "AuthSecuritySession_userId_occurredAt_idx"
    ON "AuthSecuritySession"("userId", "occurredAt");
CREATE INDEX "AuthSecuritySession_occurredAt_idx"
    ON "AuthSecuritySession"("occurredAt");
