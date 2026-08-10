import { getAdminApiUser, adminJsonResponse, adminNotFoundResponse } from "@/lib/admin-api";
import { getAdminUsersPage, parseAdminUserListQuery } from "@/lib/admin-users";

/** JSON counterpart of the server-rendered user list for admin tools. */
export async function GET(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const url = new URL(request.url);
  const page = await getAdminUsersPage(
    parseAdminUserListQuery({
      query: url.searchParams.get("query") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
    }),
  );

  return adminJsonResponse(page);
}
