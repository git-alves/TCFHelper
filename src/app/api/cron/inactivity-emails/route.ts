import { NextRequest, NextResponse } from "next/server";
import { runInactivityEmailCron } from "@/lib/inactivity-emails";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  try {
    return NextResponse.json(await runInactivityEmailCron(), {
      headers: NO_STORE_HEADERS,
    });
  } catch {
    console.error("Inactivity email cron failed");
    return NextResponse.json(
      { error: "Inactivity email cron failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
