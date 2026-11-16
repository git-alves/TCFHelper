import { notFound } from "next/navigation";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { AdminInactivityEmailsForm } from "@/components/admin-inactivity-emails-form";
import { getInactivityEmailDisplay } from "@/lib/inactivity-emails";

export default async function AdminInactivityEmailsPage() {
  try { if (!(await getCurrentAdminUser())) notFound(); } catch (error) { if (error instanceof AppUserProvisioningError) notFound(); throw error; }
  return <main className="flex w-full flex-1 flex-col gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div><p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Inactivity emails</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Edit the 7-day and 30-day emails sent to eligible learners who stop using MyTCFLab. Sending is off until you turn it on.</p></div><AdminInactivityEmailsForm initialDisplay={await getInactivityEmailDisplay()} /></main>;
}
