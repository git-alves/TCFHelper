"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useAppCopy } from "@/components/app-locale-provider";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <rect x="2.5" y="2.5" width="5" height="5" rx="1.25" />
      <rect x="11.5" y="2.5" width="5" height="5" rx="1.25" />
      <rect x="2.5" y="11.5" width="5" height="5" rx="1.25" />
      <rect x="11.5" y="11.5" width="5" height="5" rx="1.25" />
    </svg>
  );
}

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

export function NavBar() {
  const copy = useAppCopy();

  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <nav className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold tracking-tight">
          MyTCFLab
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <Show when="signed-in">
            <>
              {/* A plain Link (not a button/onClick) so the intercepted route
               * in app/@settings opens this as a modal on soft navigation,
               * while a direct visit or refresh still renders the full page. */}
              <Link
                href="/settings"
                title={copy.nav.settings}
                aria-label={copy.nav.settings}
                className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:text-zinc-300 dark:hover:bg-white/[.08]"
              >
                <SettingsIcon />
              </Link>
              <Link
                href="/dashboard"
                title={copy.nav.dashboard}
                aria-label={copy.nav.dashboard}
                className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:text-zinc-300 dark:hover:bg-white/[.08]"
              >
                <DashboardIcon />
              </Link>
              <UserButton />
            </>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                title={copy.nav.logIn}
                aria-label={copy.nav.logIn}
                className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-black/[.04] hover:text-foreground dark:text-zinc-300 dark:hover:bg-white/[.08]"
              >
                <AccountIcon />
              </button>
            </SignInButton>
          </Show>
        </div>
      </nav>
    </header>
  );
}
