import type { AdminEventLogItem } from "@/lib/admin-event-log";

// What the operational-log page shows for an event, in one place so the page
// and the .txt export can never drift apart: the export adds nothing the page
// does not show.

export const ADMIN_EVENT_MODULE_LABELS: Record<string, string> = {
  ESSAY_SERVICE: "AI services",
  QUOTA_ACCESS: "Quotas & access",
  AUTH_SECURITY: "Authentication",
  SYSTEM_INTEGRATION: "System & integrations",
};

export interface AdminEventContextItem {
  label: string;
  value: string;
  href?: string;
}

/** The "Context" column of an event: the safe, already-whitelisted details the page lists. */
export function adminEventContextItems(event: AdminEventLogItem): AdminEventContextItem[] {
  const items: AdminEventContextItem[] = [];
  if (event.userId) {
    items.push({
      label: "User",
      value: event.userEmail ?? event.userId,
      href: `/admin/users/${encodeURIComponent(event.userId)}`,
    });
  }
  if (event.essayId) items.push({ label: "Essay", value: event.essayId });
  if (event.accessCodeId) items.push({ label: "Access-code record", value: event.accessCodeId });
  if (event.provider) items.push({ label: "Provider", value: event.provider });
  if (event.model) items.push({ label: "Model", value: event.model });
  if (event.reasonCode) items.push({ label: "Reason", value: event.reasonCode.replaceAll("_", " ") });
  if (event.httpStatus !== null) items.push({ label: "HTTP", value: String(event.httpStatus) });
  if (event.quotaWindow) {
    const usage = event.usageValue === null ? "—" : event.usageValue.toLocaleString("en-US");
    const limit = event.quotaLimit === null ? "—" : event.quotaLimit.toLocaleString("en-US");
    items.push({ label: `${event.quotaWindow} quota`, value: `${usage} / ${limit}` });
  }
  if (event.maskedIp) {
    items.push({ label: "Network", value: event.maskedIp });
  }
  if (event.browserFamily || event.deviceClass) {
    const browser = event.browserFamily ?? "Other browser";
    const device = event.deviceClass ? event.deviceClass.toLowerCase() : "other device";
    items.push({ label: "Device", value: `${browser} on ${device}` });
  }
  if (event.distinctIpCount !== null && event.distinctIpCount !== undefined) {
    items.push({ label: "Distinct IP addresses", value: String(event.distinctIpCount) });
  }
  if (event.securityWindowMinutes !== null && event.securityWindowMinutes !== undefined) {
    items.push({ label: "Review window", value: `${event.securityWindowMinutes} minutes` });
  }
  return items;
}
