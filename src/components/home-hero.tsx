"use client";

import Link from "next/link";
import { useAppCopy } from "@/components/app-locale-provider";

interface HomeHeroProps {
  isAuthenticated: boolean;
}

// The page keeps its auth lookup on the server. This component only renders
// locale-dependent product copy from the client-side preference.
export function HomeHero({ isAuthenticated }: HomeHeroProps) {
  const copy = useAppCopy();

  return (
    <main className="flex flex-1 items-center justify-center bg-[#080808] px-6 py-20 text-center text-[#f5f5f5] sm:px-10">
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
