import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAdminOverviewStats } from "@/lib/admin-overview";

/** JSON counterpart of the owner-only overview page for future admin tooling. */
export async function GET() {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  return adminJsonResponse({ stats: await getAdminOverviewStats() });
}
