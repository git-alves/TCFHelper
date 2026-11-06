import { notFound } from "next/navigation";
import { AdminPromptsForm } from "@/components/admin-prompts-form";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { getPromptOverridesDisplay } from "@/lib/prompt-overrides";

export default async function AdminPromptsPage() {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  const display = await getPromptOverridesDisplay();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Prompts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Override the wording of the essay-correction prompt and the example-generation prompt, block by
            block, without an env var change or a redeploy. Clear a block to revert it to the built-in default
            shown as its placeholder.
          </p>
        </div>
      </div>

      <AdminPromptsForm initialDisplay={display} />
    </main>
  );
}
