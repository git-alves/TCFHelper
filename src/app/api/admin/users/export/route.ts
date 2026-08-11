import { adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAdminUsersForExport, parseAdminUserListQuery } from "@/lib/admin-users";
import { toCsv } from "@/lib/csv";

const CSV_HEADERS = [
  "Email",
  "Name",
  "Joined at",
  "Activated at",
  "Admin",
  "Blocked",
  "Translation chars (month)",
  "Example generations (day)",
  "Corrections (day)",
];

/** CSV counterpart of the server-rendered user list, honoring the same search/status filters but ignoring pagination. */
export async function GET(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const url = new URL(request.url);
  const { query, status } = parseAdminUserListQuery({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  const users = await getAdminUsersForExport({ query, status });

  const csv = toCsv(
    CSV_HEADERS,
    users.map((user) => [
      user.email,
      user.name ?? "",
      user.createdAt,
      user.activatedAt ?? "",
      user.isAdmin ? "yes" : "no",
      user.isBlocked ? "yes" : "no",
      String(user.usage.translation.currentMonthCharacters),
      String(user.usage.examples.currentDayRequests),
      String(user.usage.corrections.currentDayRequests),
    ]),
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
