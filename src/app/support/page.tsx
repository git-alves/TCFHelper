import { SupportPageContent } from "@/components/support-page-content";
import { getAppCopy } from "@/lib/app-copy";
import { getRequestLocale } from "@/lib/request-locale";

export default async function SupportPage() {
  const copy = getAppCopy(await getRequestLocale());

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.support.title}</h1>
      <SupportPageContent />
    </main>
  );
}
