"use client";

import Link from "next/link";
import { Show, SignOutButton } from "@clerk/nextjs";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { APP_LOCALES, APP_LOCALE_LABELS } from "@/lib/app-locale";

export function NavBar() {
  const { locale, setLocale } = useAppLocale();
  const copy = useAppCopy();

  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <nav className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold tracking-tight">
          MyTCFLab
        </Link>
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <label className="flex items-center gap-1.5">
            <span className="sr-only">{copy.nav.localeLabel}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              title={copy.nav.localeHelp}
              className="rounded-full border border-black/[.15] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]"
            >
              {APP_LOCALES.map((code) => (
                <option key={code} value={code} className="text-black">
                  {APP_LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <Show when="signed-in">
            <>
              <Link href="/dashboard" className="hover:underline">
                {copy.nav.dashboard}
              </Link>
              <Link href="/settings" className="hover:underline">
                {copy.nav.settings}
              </Link>
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="rounded-full border border-black/[.08] px-4 py-1.5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
                >
                  {copy.nav.signOut}
                </button>
              </SignOutButton>
            </>
          </Show>
          <Show when="signed-out">
            <>
              <Link href="/login" className="hover:underline">
                {copy.nav.logIn}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-foreground px-4 py-1.5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                {copy.nav.signUp}
              </Link>
            </>
          </Show>
        </div>
      </nav>
    </header>
  );
}
