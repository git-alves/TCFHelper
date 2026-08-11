import { adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAdminAccessCodesForExport, parseAdminAccessCodesListQuery } from "@/lib/admin-access-codes";
import { toCsv } from "@/lib/csv";

const CSV_HEADERS = ["Code", "Note", "Created at", "Redeemed by", "Redeemed at", "Validity", "Expires at"];

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
  const accessCodes = await getAdminAccessCodesForExport(query);

  const csv = toCsv(
    CSV_HEADERS,
    accessCodes.map((code) => [
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
      "Cache-Control": "private, no-store",
    },
  });
}
