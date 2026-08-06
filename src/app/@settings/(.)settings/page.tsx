import { Modal } from "@/components/modal";
import { SettingsPageContent } from "@/components/settings-page-content";
import { getAppCopy } from "@/lib/app-copy";
import { getRequestLocale } from "@/lib/request-locale";

// Intercepts client-side navigation to /settings so it opens as a modal over
// whatever page the learner was on; a hard navigation or refresh still
// renders the full page at app/settings/page.tsx instead.
export default async function InterceptedSettingsModal() {
  const locale = await getRequestLocale();
  const copy = getAppCopy(locale);

  return (
    <Modal closeLabel={copy.common.close}>
      <SettingsPageContent />
    </Modal>
  );
}
