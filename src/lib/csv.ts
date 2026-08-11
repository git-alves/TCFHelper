// RFC 4180-style escaping: a field containing a comma, quote, or newline is
// wrapped in quotes, with any interior quote doubled. Plain fields are left
// bare rather than always-quoted, so exports stay readable in a plain text
// viewer, not just a spreadsheet app.
function toCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CRLF row endings, matching RFC 4180 -- the widest-compatibility choice for CSV. */
export function toCsv(header: string[], rows: string[][]): string {
  const lines = [header, ...rows].map((fields) => fields.map(toCsvField).join(","));
  return lines.join("\r\n") + "\r\n";
}
