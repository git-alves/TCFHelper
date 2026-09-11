"use client";

import Link from "next/link";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { ThemedSelect } from "@/components/themed-select";
import { APP_LOCALES, APP_LOCALE_LABELS } from "@/lib/app-locale";

interface HomeHeroProps {
  isAuthenticated: boolean;
}

// The page keeps its auth lookup on the server. This component only renders
// locale-dependent product copy from the client-side preference.
export function HomeHero({ isAuthenticated }: HomeHeroProps) {
  const copy = useAppCopy();
  const { locale, setLocale } = useAppLocale();

  return (
    <main className="relative flex flex-1 items-center justify-center bg-[#080808] px-6 py-20 text-center text-[#f5f5f5] sm:px-10">
      <div className="absolute top-6 right-6 z-10 sm:right-10">
        <ThemedSelect<typeof locale>
          ariaLabel="Language"
          value={locale}
          onChange={setLocale}
          options={APP_LOCALES.map((code) => ({ value: code, label: APP_LOCALE_LABELS[code] }))}
          buttonClassName="flex min-w-32 items-center justify-between gap-2 rounded-full border border-white/20 bg-white/[.06] px-3 py-2 text-left text-sm text-zinc-100 shadow-sm outline-none transition-colors hover:bg-white/[.1] focus:border-white/60"
          listClassName="absolute right-0 z-20 mt-1 flex min-w-32 flex-col gap-0.5 overflow-auto rounded-xl border border-white/20 bg-zinc-950 p-1 text-zinc-100 shadow-xl"
          optionClassName="w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-white/[.1]"
        />
      </div>
      <section className="flex w-full max-w-2xl flex-col items-center">
        <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
          {copy.home.title}
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-zinc-400 sm:text-lg">
          {copy.home.description}
        </p>
        <Link
          href={isAuthenticated ? "/tasks" : "/signup"}
          className="mt-7 rounded-full bg-[#f5f5f5] px-7 py-3 text-base font-medium text-[#111] transition-transform transition-colors hover:scale-[1.02] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          {isAuthenticated ? copy.home.startATask : copy.home.getStarted}
        </Link>
      </section>
    </main>
  );
}
