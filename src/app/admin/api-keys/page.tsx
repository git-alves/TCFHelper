import { notFound } from "next/navigation";
import { AdminApiKeysForm } from "@/components/admin-api-keys-form";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { getAppConfigDisplay } from "@/lib/app-config";

export default async function AdminApiKeysPage() {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  const display = await getAppConfigDisplay();

  return (
    <main className="flex w-full flex-1 flex-col gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Override the Gemini API key and model used for essay correction and for example generation,
            independently, without an env var change or a redeploy.
          </p>
        </div>
      </div>

      <AdminApiKeysForm initialDisplay={display} />
    </main>
  );
}
