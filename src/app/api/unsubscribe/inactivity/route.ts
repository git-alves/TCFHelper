import { NextRequest, NextResponse } from "next/server";
import { unsubscribeFromInactivityEmails } from "@/lib/inactivity-emails";

// RFC 8058 one-click endpoint used by List-Unsubscribe-Post. It intentionally
// returns no recipient/account detail for invalid, repeated, or valid tokens.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  await unsubscribeFromInactivityEmails(token);
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "private, no-store" },
  });
}
