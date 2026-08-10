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
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">{copy.home.title}</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        {copy.home.description}
      </p>
      <Link
        href={isAuthenticated ? "/tasks" : "/signup"}
        className="rounded-full bg-foreground px-6 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {isAuthenticated ? copy.home.startATask : copy.home.getStarted}
      </Link>
    </main>
  );
}
