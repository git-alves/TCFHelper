import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAdminOverviewStats } from "@/lib/admin-overview";

/**
 * JSON counterpart of the owner-only overview page, and the endpoint the
 * "online now" tile polls client-side. That polling must not touch the
 * owner's own presence -- otherwise leaving the dashboard open (including in
 * a backgrounded tab) would make the owner appear perpetually online
 * regardless of real activity, unlike every other admin/learner request.
 */
export async function GET() {
  const admin = await getAdminApiUser({ skipPresenceTouch: true });
  if (!admin) return adminNotFoundResponse();

  return adminJsonResponse({ stats: await getAdminOverviewStats() });
}
