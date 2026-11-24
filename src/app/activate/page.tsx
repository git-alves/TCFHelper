import { redirect } from "next/navigation";
import { AccessCodeActivationForm } from "@/components/access-code-activation-form";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { getAppCopy } from "@/lib/app-copy";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { getRequestLocale } from "@/lib/request-locale";

export default async function ActivatePage() {
  let user;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return <DashboardAccountUnavailable />;
    }
    throw error;
  }

  if (!user) {
    await redirectForUnauthenticatedOrBlockedUser("/activate");
    return null;
  }

  let isActivated: boolean;
  try {
    isActivated = user.isAdmin || (await hasRedeemedAccessCode(user.id));
  } catch {
    // Fail closed if activation state cannot be read. Rendering this isolated
    // page is safe; allowing a route into the app would not be.
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
        <h1 className="text-2xl font-semibold tracking-tight">Activation is temporarily unavailable</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          We could not verify your account access. Please try again shortly.
        </p>
      </main>
    );
  }

  // Outside the try/catch above: Next.js redirects by throwing, and a
  // blanket catch around that throw would misreport a normal redirect as
  // the "activation temporarily unavailable" failure instead of navigating.
  if (isActivated) {
    redirect("/tasks");
  }

  const expiredAt = user.accessExpiredAt?.toISOString() ?? null;

  const locale = await getRequestLocale();
  const copy = getAppCopy(locale).activation;
  const expiredEndDate = expiredAt
    ? new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : locale, { dateStyle: "long" }).format(new Date(expiredAt))
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
      <p className="text-sm font-medium text-violet-700 dark:text-violet-300">{copy.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{expiredEndDate ? copy.expiredTitle : copy.title}</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        {expiredEndDate ? copy.expiredDescription : copy.description}
      </p>
      <AccessCodeActivationForm label={expiredEndDate ? copy.newCodeLabel : undefined} />
    </main>
  );
}
