import { Modal } from "@/components/modal";
import { SupportPageContent } from "@/components/support-page-content";
import { getAppCopy } from "@/lib/app-copy";
import { getRequestLocale } from "@/lib/request-locale";

// A client-side navigation to /support stays in context as a modal; a direct
// visit and refresh use app/support/page.tsx as a normal, shareable page.
export default async function InterceptedSupportModal() {
  const locale = await getRequestLocale();
  const copy = getAppCopy(locale);

  return (
    <Modal
      closeLabel={copy.common.close}
      ariaLabel={copy.support.title}
      title={copy.support.title}
      panelClassName="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/[.1] bg-background shadow-2xl dark:border-white/[.15]"
    >
      <div className="p-5 sm:p-6">
        <SupportPageContent />
      </div>
    </Modal>
  );
}
