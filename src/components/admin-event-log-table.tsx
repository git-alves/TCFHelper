import Link from "next/link";
import type { AdminEventLogItem } from "@/lib/admin-event-log";
import { ADMIN_EVENT_MODULE_LABELS, adminEventContextItems } from "@/lib/admin-event-log-display";

const SEVERITY_CLASSES: Record<string, string> = {
  INFO: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  WARN: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  ERROR: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const SEVERITY_SYMBOLS: Record<string, string> = {
  INFO: "🟢",
  WARN: "🟡",
  ERROR: "🔴",
};

function formatUtc(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function AdminEventLogTable({ events }: { events: AdminEventLogItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[.1] dark:border-white/[.15]">
      <table className="w-full min-w-[900px] text-left text-sm">
        <caption className="sr-only">Structured operational events</caption>
        <thead className="border-b border-black/[.1] text-xs font-medium text-zinc-500 dark:border-white/[.15] dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">Occurred (UTC)</th>
            <th scope="col" className="px-4 py-3">Level</th>
            <th scope="col" className="px-4 py-3">Area</th>
            <th scope="col" className="px-4 py-3">Event</th>
            <th scope="col" className="px-4 py-3">Context</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.1]">
          {events.map((event) => {
            const context = adminEventContextItems(event);
            return (
              <tr key={event.id}>
                <td className="whitespace-nowrap px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                  <time dateTime={event.occurredAt}>{formatUtc(event.occurredAt)} UTC</time>
                  {event.occurrenceCount > 1 && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {event.occurrenceCount.toLocaleString("en-US")} occurrences since {formatUtc(event.firstOccurredAt)} UTC
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[event.severity] ?? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"}`}>
                    <span aria-hidden="true">{SEVERITY_SYMBOLS[event.severity] ?? "•"}</span>
                    <span className="ml-1">{event.severity}</span>
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">
                  {ADMIN_EVENT_MODULE_LABELS[event.module] ?? event.module}
                </td>
                <td className="max-w-md px-4 py-3 align-top">
                  <p>{event.message}</p>
                  <code className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{event.eventType}</code>
                </td>
                <td className="max-w-sm px-4 py-3 align-top">
                  {context.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {context.map((item) => (
                        <li key={`${item.label}-${item.value}`}>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.label}: </span>
                          {item.href ? (
                            <Link href={item.href} className="text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">
                              {item.value}
                            </Link>
                          ) : (
                            <span
                              className={item.label === "Essay" || item.label === "Access-code record" ? "font-mono" : undefined}
                              aria-label={item.label === "Network" ? `Masked IP address ${item.value}` : undefined}
                            >
                              {item.value}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
