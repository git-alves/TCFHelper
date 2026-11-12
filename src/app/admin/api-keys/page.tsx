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
            Choose the AI provider, API key and model used for essay correction and for example generation,
            independently, without an env var change or a redeploy.
          </p>
        </div>
      </div>

      <section
        aria-labelledby="api-keys-help-heading"
        className="max-w-3xl rounded-xl border border-black/[.1] bg-black/[.02] p-4 text-sm leading-6 text-zinc-700 dark:border-white/[.15] dark:bg-white/[.03] dark:text-zinc-300"
      >
        <h2 id="api-keys-help-heading" className="font-semibold">
          Before you pick a model
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Essay correction</strong> needs a model that supports structured JSON output (OpenRouter&apos;s{" "}
            <code>response_format</code> <code>json_schema</code>) and at least 8,192 output tokens. Not every OpenRouter model
            does, and a model that does not will make corrections fail. <strong>Example generation</strong> only needs a model
            that writes plain text.
          </li>
          <li>
            Use the <strong>Test</strong> button under each section: it makes one small real call with the values in the form,
            even before you save them, and tells you whether the key and model work.
          </li>
          <li>
            A key or model saved here <strong>takes precedence</strong> over the environment variables (
            <code>OPENROUTER_API_KEY</code>, <code>GEMINI_API_KEY</code> and the model variables). Clear it to fall back to the
            environment.
          </li>
          <li>
            Choosing a different provider for a section removes that section&apos;s saved key and model when you save, so one
            provider&apos;s key is never sent to another.
          </li>
        </ul>
      </section>

      <AdminApiKeysForm initialDisplay={display} />
    </main>
  );
}
