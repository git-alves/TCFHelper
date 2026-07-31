import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WritingWorkspace } from "@/components/writing-workspace";

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
      <WritingWorkspace />
    </main>
  );
}
