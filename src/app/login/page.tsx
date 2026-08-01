"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useAppCopy } from "@/components/app-locale-provider";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

type LoginError = "invalidCredentials";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = useAppCopy();
  const callbackUrl = getSafeRedirectPath(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("invalidCredentials");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.login.title}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {copy.login.emailLabel}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-black/[.15] bg-transparent px-3 py-2 outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {copy.login.passwordLabel}
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-black/[.15] bg-transparent px-3 py-2 outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{copy.login[error]}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-foreground px-5 py-2.5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {isSubmitting ? copy.login.submitting : copy.login.submit}
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {copy.login.noAccount}{" "}
        <Link href="/signup" className="font-medium underline">
          {copy.login.signUp}
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
