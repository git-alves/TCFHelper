"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useAppCopy } from "@/components/app-locale-provider";
import { useDashboardNavGuard } from "@/components/dashboard-nav-guard";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.34 2.5h3.32l.46 2.32a6.5 6.5 0 0 1 1.68.98l2.24-.78 1.66 2.88-1.8 1.54a6.5 6.5 0 0 1 0 1.94l1.8 1.54-1.66 2.88-2.24-.78a6.5 6.5 0 0 1-1.68.98l-.46 2.32H8.34l-.46-2.32a6.5 6.5 0 0 1-1.68-.98l-2.24.78-1.66-2.88 1.8-1.54a6.5 6.5 0 0 1 0-1.94l-1.8-1.54 1.66-2.88 2.24.78a6.5 6.5 0 0 1 1.68-.98l.46-2.32Z"
      />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function TourIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m12.75 7.25-1.5 4-4 1.5 1.5-4 4-1.5Z" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="10" cy="7" r="3.25" />
      <path strokeLinecap="round" d="M3.75 16.25a6.25 6.25 0 0 1 12.5 0" />
    </svg>
  );
}

const ICON_BUTTON_CLASS =
  "rounded-full p-2 text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:text-zinc-300 dark:hover:bg-white/[.08]";

const NAV_BUTTON_CLASS =
  "shrink-0 rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:border-white/[.2] dark:hover:bg-white/[.06]";
const ACTIVE_NAV_BUTTON_CLASS =
  "shrink-0 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background dark:bg-white dark:text-black";

export function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const copy = useAppCopy();
  const pathname = usePathname();
  const { requestNavigation, isNavigationBusy, isWorkspaceMounted } = useDashboardNavGuard();
  const { requestStart: requestWalkthroughStart, isAvailable: isWalkthroughAvailable } = useWalkthroughTrigger();

  // The workspace can stay mounted while Settings is open, so it remains
  // the source of truth for whether leaving this page needs a draft guard.
  const onTasks = isWorkspaceMounted;

  // Settings changes the URL while leaving the underlying page mounted.
  // Preserve that page identity so the active navigation item does not
  // change just because the Settings modal is open.
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [lastRealPathname, setLastRealPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (pathname !== "/settings") setLastRealPathname(pathname);
  }
  const realPathname = pathname === "/settings" ? lastRealPathname : pathname;
  const isOnAdminPage = realPathname === "/admin" || realPathname.startsWith("/admin/");

  // Settings sets the URL to exactly /settings while its own modal is open
  // (and only then), so — unlike the workspace-mounted check above — the
  // pathname genuinely is the right signal here. Clicking Dashboard while
  // Settings is open would open the workspace's own discard-confirmation
  // dialog underneath the still-mounted Settings modal: same z-index, later
  // in the DOM, so Settings would cover it and both dialogs' focus traps
  // would compete. Blocking the click instead of racing the two modals.
  const isSettingsOpen = pathname === "/settings";
  const isDashboardBlocked = isNavigationBusy || isSettingsOpen;
  const dashboardBlockedReason = isNavigationBusy
    ? copy.workspace.editor.correctingStatus
    : copy.nav.closeSettingsFirst;

  function guardedNavigationHandler(destination: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (requestNavigation(destination)) event.preventDefault();
    };
  }

  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <nav className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold tracking-tight">
          MyTCFLab
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <Show when="signed-in">
            <>
              {/* Keep the three main destinations in one stable order. The
               * active treatment describes where the learner is; prominence
               * for the next learning action belongs inside each page. */}
              {onTasks && isDashboardBlocked ? (
                <>
                  <button
                    type="button"
                    disabled
                    data-walkthrough="nav-dashboard"
                    title={dashboardBlockedReason}
                    aria-label={`${copy.nav.dashboard} — ${dashboardBlockedReason}`}
                    className={NAV_BUTTON_CLASS}
                  >
                    {copy.nav.dashboard}
                  </button>
                  <button
                    type="button"
                    disabled
                    data-walkthrough="nav-practice"
                    title={dashboardBlockedReason}
                    aria-label={`${copy.nav.practice} — ${dashboardBlockedReason}`}
                    className={NAV_BUTTON_CLASS}
                  >
                    {copy.nav.practice}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    data-walkthrough="nav-dashboard"
                    onClick={guardedNavigationHandler("/dashboard")}
                    aria-current={realPathname === "/dashboard" ? "page" : undefined}
                    className={realPathname === "/dashboard" ? ACTIVE_NAV_BUTTON_CLASS : NAV_BUTTON_CLASS}
                  >
                    {copy.nav.dashboard}
                  </Link>
                  <Link
                    href="/practice"
                    data-walkthrough="nav-practice"
                    onClick={guardedNavigationHandler("/practice")}
                    aria-current={realPathname === "/practice" ? "page" : undefined}
                    className={realPathname === "/practice" ? ACTIVE_NAV_BUTTON_CLASS : NAV_BUTTON_CLASS}
                  >
                    {copy.nav.practice}
                  </Link>
                </>
              )}
              <Link
                href="/tasks"
                data-walkthrough="nav-tasks"
                aria-current={onTasks ? "page" : undefined}
                className={onTasks ? ACTIVE_NAV_BUTTON_CLASS : NAV_BUTTON_CLASS}
              >
                {copy.nav.tasks}
              </Link>
              {isAdmin && !isOnAdminPage && (
                // Same in-flight-work protection as Dashboard above: reachable
                // from /tasks, so it must not let an owner leave a draft or an
                // unabortable in-flight correction behind unconfirmed.
                onTasks && isDashboardBlocked ? (
                  <button
                    type="button"
                    disabled
                    title={dashboardBlockedReason}
                    aria-label={`${copy.nav.admin} — ${dashboardBlockedReason}`}
                    className={NAV_BUTTON_CLASS}
                  >
                    {copy.nav.admin}
                  </button>
                ) : (
                  <Link href="/admin" onClick={guardedNavigationHandler("/admin")} className={NAV_BUTTON_CLASS}>
                    {copy.nav.admin}
                  </Link>
                )
              )}
              {isWalkthroughAvailable && (
                <button
                  type="button"
                  onClick={requestWalkthroughStart}
                  title={copy.walkthrough.takeATour}
                  aria-label={copy.walkthrough.takeATour}
                  className={ICON_BUTTON_CLASS}
                >
                  <TourIcon />
                </button>
              )}
              {/* A plain Link (not a button/onClick) so the intercepted route
               * in app/@settings opens this as a modal on soft navigation,
               * while a direct visit or refresh still renders the full page.
               * prefetch={false}: this Link is persistent across every
               * client-side navigation in the app (it lives in the nav bar,
               * outside {children}), so Next's background prefetch for it
               * gets established once, from whatever page happened to be
               * active when it first entered the viewport, and is then
               * reused on click regardless of the page the learner is
               * actually on. Interception depends on the referring page at
               * click time, so a reused prefetch cached under a different
               * referrer can serve the plain, non-intercepted /settings page
               * instead of the modal. Disabling prefetch forces a fresh
               * request on every click, always carrying the correct
               * referrer. */}
              <Link
                href="/settings"
                prefetch={false}
                data-walkthrough="nav-settings"
                title={copy.nav.settings}
                aria-label={copy.nav.settings}
                className={ICON_BUTTON_CLASS}
              >
                <SettingsIcon />
              </Link>
              <UserButton />
            </>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" title={copy.nav.logIn} aria-label={copy.nav.logIn} className={ICON_BUTTON_CLASS}>
                <AccountIcon />
              </button>
            </SignInButton>
          </Show>
        </div>
      </nav>
    </header>
  );
}
