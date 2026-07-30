import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {session.user.name ?? session.user.email}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The essay writing workspace, topic picker, and feedback report live
        here. This is a placeholder while that feature is built out.
      </p>
    </main>
  );
}
