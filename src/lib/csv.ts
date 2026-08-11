// A leading =, +, -, or @ (optionally after whitespace/control characters,
// which spreadsheet apps skip over the same way) makes Excel/Sheets/Numbers
// read a cell as a formula rather than text. A note or display name in an
// export is learner-controlled input, not code we authored, so it must be
// neutralized before it ever reaches a spreadsheet app. Prefixing with a
// single quote is the standard mitigation (OWASP CSV injection): it forces
// text interpretation while leaving the visible value unchanged everywhere
// but the formula-trigger cases this targets.
const FORMULA_TRIGGER_PATTERN = /^[\s\x00-\x1f]*[=+\-@]/;

function neutralizeFormulaInjection(value: string): string {
  return FORMULA_TRIGGER_PATTERN.test(value) ? `'${value}` : value;
}

// RFC 4180-style escaping: a field containing a comma, quote, or newline is
// wrapped in quotes, with any interior quote doubled. Plain fields are left
// bare rather than always-quoted, so exports stay readable in a plain text
// viewer, not just a spreadsheet app.
function toCsvField(value: string): string {
  const safe = neutralizeFormulaInjection(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/** CRLF row endings, matching RFC 4180 -- the widest-compatibility choice for CSV. */
export function toCsv(header: string[], rows: string[][]): string {
  const lines = [header, ...rows].map((fields) => fields.map(toCsvField).join(","));
  return lines.join("\r\n") + "\r\n";
}
