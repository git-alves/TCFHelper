import { adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import {
  MAX_ACCESS_CODES_EXPORT_ROWS,
  getAdminAccessCodesForExport,
  parseAdminAccessCodesListQuery,
} from "@/lib/admin-access-codes";
import { toCsv } from "@/lib/csv";

const CSV_HEADERS = ["Code", "Note", "Created at", "Redeemed by", "Redeemed at", "Validity", "Expires at"];
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function formatValidity(validityDays: number | null) {
  return validityDays === null ? "Lifetime" : `${validityDays} days`;
}

/** CSV counterpart of the server-rendered access-code list, honoring the same search filter but ignoring pagination. */
export async function GET(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const url = new URL(request.url);
  const { query } = parseAdminAccessCodesListQuery({
    query: url.searchParams.get("query") ?? undefined,
  });
  const result = await getAdminAccessCodesForExport(query);

  // Never emit a CSV that silently omits rows past the export cap -- a file
  // that looks complete but is missing records is worse than an explicit
  // refusal telling the admin to narrow the filter.
  if (result.truncated) {
    return Response.json(
      {
        error: `This filter matches ${result.total.toLocaleString("en-US")} codes, more than the ${MAX_ACCESS_CODES_EXPORT_ROWS.toLocaleString("en-US")}-row export limit. Narrow your search before exporting.`,
      },
      { status: 413, headers: NO_STORE_HEADERS },
    );
  }

  const csv = toCsv(
    CSV_HEADERS,
    result.accessCodes.map((code) => [
      code.code,
      code.note ?? "",
      code.createdAt,
      code.redeemedByUserEmail ?? "",
      code.redeemedAt ?? "",
      formatValidity(code.validityDays),
      code.expiresAt ?? "",
    ]),
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="access-codes.csv"',
      ...NO_STORE_HEADERS,
    },
  });
}
