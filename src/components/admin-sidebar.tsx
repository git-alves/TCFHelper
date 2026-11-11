"use client";

import { usePathname } from "next/navigation";
import { AdminPromptsNavLink } from "@/components/admin-prompts-nav-guard";
import { useAdminSupportInbox } from "@/components/admin-support-inbox-count";

interface AdminSection {
  href: string;
  label: string;
}

const ADMIN_SECTION_GROUPS: { label: string; sections: AdminSection[] }[] = [
  {
    label: "Manage",
    sections: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/access-codes", label: "Access codes" },
      { href: "/admin/support", label: "Support requests" },
    ],
  },
  {
    label: "System",
    sections: [
      { href: "/admin/logs", label: "Operational log" },
      { href: "/admin/api-keys", label: "API keys" },
      { href: "/admin/prompts", label: "Prompts" },
    ],
  },
];

// Overview lives at the bare /admin, so it must match exactly -- every other
// section also owns its sub-routes (e.g. /admin/users/<id> keeps "Users" lit).
function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The admin area's section navigation: a fixed side rail on wide screens that
 * collapses to a horizontally-scrolling tab strip on narrow ones. Uses the
 * unsaved-prompt-aware link so leaving /admin/prompts mid-edit still confirms.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  // The same count as the nav bell. It drops to zero as soon as the support
  // inbox is opened, without waiting for a full page load.
  const newSupportTickets = useAdminSupportInbox().count ?? 0;

  return (
    <aside className="shrink-0 border-b border-black/[.1] bg-zinc-50 md:w-60 md:border-b-0 md:border-r dark:border-white/[.15] dark:bg-zinc-900/50">
      <div className="md:sticky md:top-0 md:max-h-screen md:overflow-y-auto">
        <h2 className="px-4 pt-4 text-lg font-semibold tracking-tight md:px-5 md:pt-6 md:text-xl">Admin Panel</h2>
        <nav aria-label="Admin sections" className="mt-3 pb-3 md:mt-5 md:pb-6">
          <div className="flex gap-1 overflow-x-auto px-3 [scrollbar-width:thin] md:flex-col md:gap-0 md:overflow-visible">
            {ADMIN_SECTION_GROUPS.map((group, index) => (
              <div
                key={group.label}
                className={`flex gap-1 md:flex-col ${index > 0 ? "md:mt-5 md:border-t md:border-black/[.08] md:pt-4 dark:md:border-white/[.1]" : ""}`}
              >
                <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:block dark:text-zinc-400">
                  {group.label}
                </p>
                {group.sections.map((section) => {
                  const active = isActive(pathname, section.href);
                  return (
                    <AdminPromptsNavLink
                      key={section.href}
                      href={section.href}
                      aria-current={active ? "page" : undefined}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100"
                          : "text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.07]"
                      }`}
                    >
                      {section.label}
                      {section.href === "/admin/support" && newSupportTickets > 0 && (
                        <>
                          <span
                            data-testid="admin-sidebar-support-badge"
                            aria-hidden="true"
                            className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 align-middle text-[10px] font-semibold leading-none text-white"
                          >
                            {newSupportTickets > 9 ? "9+" : newSupportTickets}
                          </span>
                          <span className="sr-only">, {newSupportTickets} new</span>
                        </>
                      )}
                    </AdminPromptsNavLink>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
