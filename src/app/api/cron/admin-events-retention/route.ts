import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredAdminEvents } from "@/lib/admin-events";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Enforces the owner-approved 30-day operational-event retention policy.
 * Vercel invokes this daily in UTC and supplies CRON_SECRET as a bearer token;
 * the route deliberately has no cookie/admin-session fallback, so a browser
 * user cannot accidentally run destructive retention work.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  try {
    const result = await purgeExpiredAdminEvents();
    return NextResponse.json({ deleted: result.count }, { headers: NO_STORE_HEADERS });
  } catch {
    // A failed deletion remains visible in the Vercel cron/function log. The
    // same database might be unavailable, so it cannot reliably self-report
    // this failure into AdminEvent.
    console.error("Admin-event retention purge failed");
    return NextResponse.json(
      { error: "Retention purge failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
