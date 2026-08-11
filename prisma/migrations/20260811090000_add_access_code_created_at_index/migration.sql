-- Purely additive: matches getAdminAccessCodesPage's
-- orderBy([{createdAt: "desc"}, {id: "desc"}]) + skip/take exactly, so the
-- admin access-code list stays an index scan instead of an in-memory sort
-- as the code inventory grows.
CREATE INDEX "AccessCode_createdAt_id_idx" ON "AccessCode"("createdAt", "id");
