import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WritingWorkspace } from "@/components/writing-workspace";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {session.user.name ?? session.user.email}
      </h1>
      <WritingWorkspace />
    </main>
  );
}
