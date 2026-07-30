import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        Write for the TCF exam. Get feedback that gets you to B2 or C1.
      </h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Practice Task 1, 2, and 3 essays, then get grammar, vocabulary, and
        CEFR-level feedback in seconds.
      </p>
      <Link
        href={session ? "/dashboard" : "/signup"}
        className="rounded-full bg-foreground px-6 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {session ? "Go to dashboard" : "Get started"}
      </Link>
    </main>
  );
}
