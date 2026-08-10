import { getAdminApiUser, adminJsonResponse, adminNotFoundResponse } from "@/lib/admin-api";
import { getAdminUserDetail } from "@/lib/admin-users";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const { userId } = await params;
  const user = await getAdminUserDetail(userId);
  if (!user) return adminNotFoundResponse();

  return adminJsonResponse({ user });
}
