import type { AdminEventLogItem, AdminEventLogQuery } from "@/lib/admin-event-log";
import { ADMIN_EVENT_MODULE_LABELS, adminEventContextItems } from "@/lib/admin-event-log-display";

// Plain-text rendering of the operational log, for saving or pasting into a
// message. It contains exactly what the page shows for each event (see
// admin-event-log-display.ts) -- never raw payloads, tokens or keys, because
// the log reader never returns any.

const RANGE_LABELS = {
  today: "Today",
  "last-7-days": "Last 7 days",
  "current-month": "Current month",
  custom: "Custom range",
} as const;

// The page's own "HTTP" context label, spelled out for a file read outside it.
const EXPORT_LABELS: Record<string, string> = { HTTP: "HTTP status" };

function utc(value: Date | string) {
  const iso = typeof value === "string" ? value : value.toISOString();
  return `${iso.slice(0, 19).replace("T", " ")} UTC`;
}

// No real value comes near this (an email address is at most 254 characters
// and a model name is capped at 200 by the database), so it only bounds a
// pathological one: the file's size must not be set by a single field.
export const MAX_EXPORT_VALUE_CHARS = 320;

// Every value sits on one line, so a stray line break can never fake a new
// field or a new block, and no value is longer than MAX_EXPORT_VALUE_CHARS
// characters (counted as whole characters, so a surrogate pair is never split).
function oneLine(value: string) {
  const line = value.replace(/[\r\n\u2028\u2029]+/g, " ").trim();
  const characters = Array.from(line);
  return characters.length > MAX_EXPORT_VALUE_CHARS ? `${characters.slice(0, MAX_EXPORT_VALUE_CHARS - 1).join("")}…` : line;
}

/** tcflab-logs-YYYY-MM-DD-HHmm.txt, in UTC. */
export function adminEventLogExportFilename(now: Date) {
  const iso = now.toISOString();
  return `tcflab-logs-${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}.txt`;
}

type ExportFilters = Pick<AdminEventLogQuery, "range" | "severity" | "module" | "q" | "start" | "end">;

function formatEvent(event: AdminEventLogItem) {
  const lines = [
    `${utc(event.occurredAt)} | ${oneLine(event.severity)} | ${oneLine(ADMIN_EVENT_MODULE_LABELS[event.module] ?? event.module)}`,
    oneLine(event.message),
    `Event type: ${oneLine(event.eventType)}`,
  ];
  for (const item of adminEventContextItems(event)) {
    lines.push(`${EXPORT_LABELS[item.label] ?? item.label}: ${oneLine(item.value)}`);
  }
  if (event.occurrenceCount > 1) {
    lines.push(
      `Occurrences: ${event.occurrenceCount.toLocaleString("en-US")} (first ${utc(event.firstOccurredAt)}, last ${utc(event.occurredAt)})`,
    );
  }
  return lines.join("\n");
}

/**
 * The export file: a header (when it was made, the filters in words, how many
 * events, the retention cutoff) and then one block per event, newest first,
 * separated by a blank line. A field that does not apply is left out, never
 * written as "null".
 */
export function formatAdminEventLogTxt({
  events,
  filters,
  generatedAt,
  retentionCutoff,
}: {
  /** Already newest first, as the log reader returns them. */
  events: readonly AdminEventLogItem[];
  filters: ExportFilters;
  generatedAt: Date;
  retentionCutoff: Date | string;
}) {
  const header = [
    "TCFLab operational log export",
    `Generated: ${utc(generatedAt)}`,
    `Time range: ${RANGE_LABELS[filters.range]} (${utc(filters.start)} to ${filters.range === "custom" ? utc(filters.end) : "now"})`,
    `Level: ${filters.severity ?? "all levels"}`,
    `Area: ${filters.module ? (ADMIN_EVENT_MODULE_LABELS[filters.module] ?? filters.module) : "all areas"}`,
    `Search: ${filters.q ? `“${oneLine(filters.q)}”` : "none"}`,
    `Events: ${events.length.toLocaleString("en-US")} (newest first)`,
    `Retention cutoff: ${utc(retentionCutoff)}`,
  ].join("\n");

  if (events.length === 0) return `${header}\n\nNo events match these filters.\n`;
  return `${header}\n\n${events.map(formatEvent).join("\n\n")}\n`;
}
