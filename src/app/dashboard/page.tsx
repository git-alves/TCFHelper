import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardHeading } from "@/components/dashboard-heading";
import { WritingWorkspace } from "@/components/writing-workspace";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <DashboardHeading name={session.user.name ?? session.user.email} />
      <WritingWorkspace />
    </main>
  );
}
