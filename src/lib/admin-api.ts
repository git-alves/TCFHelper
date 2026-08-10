import "server-only";

import { NextResponse } from "next/server";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

/**
 * Admin routes deliberately answer 404 for every account that is not the
 * owner. Keeping the guard here prevents a later route from accidentally
 * leaking that an administrative endpoint exists through a 401 or 403.
 */
export async function getAdminApiUser() {
  try {
    return await getCurrentAdminUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) return null;
    throw error;
  }
}

export function adminNotFoundResponse() {
  return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
}

export function adminJsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}
