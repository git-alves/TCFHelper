"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useAppLocale } from "@/components/app-locale-provider";
import { APP_LOCALES, APP_LOCALE_LABELS } from "@/lib/app-locale";

export function NavBar() {
  const { status } = useSession();
  const { locale, setLocale } = useAppLocale();

  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <nav className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold tracking-tight">
          TCF Helper
        </Link>
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Feedback and translation language</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              title="Language used for essay feedback and the live translation panel"
              className="rounded-full border border-black/[.15] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]"
            >
              {APP_LOCALES.map((code) => (
                <option key={code} value={code} className="text-black">
                  {APP_LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          {status === "authenticated" ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-black/[.08] px-4 py-1.5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
              >
                Sign out
              </button>
            </>
          ) : status === "loading" ? null : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-foreground px-4 py-1.5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
