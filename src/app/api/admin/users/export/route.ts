import { adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { MAX_USERS_EXPORT_ROWS, getAdminUsersForExport, parseAdminUserListQuery } from "@/lib/admin-users";
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
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

/** CSV counterpart of the server-rendered user list, honoring the same search/status filters but ignoring pagination. */
export async function GET(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const url = new URL(request.url);
  const { query, status } = parseAdminUserListQuery({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  const result = await getAdminUsersForExport({ query, status });

  // Never emit a CSV that silently omits rows past the export cap -- a file
  // that looks complete but is missing records is worse than an explicit
  // refusal telling the admin to narrow the filter.
  if (result.truncated) {
    return Response.json(
      {
        error: `This filter matches ${result.total.toLocaleString("en-US")} users, more than the ${MAX_USERS_EXPORT_ROWS.toLocaleString("en-US")}-row export limit. Narrow your search before exporting.`,
      },
      { status: 413, headers: NO_STORE_HEADERS },
    );
  }

  const csv = toCsv(
    CSV_HEADERS,
    result.users.map((user) => [
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
      ...NO_STORE_HEADERS,
    },
  });
}
