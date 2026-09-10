import { Modal } from "@/components/modal";
import { SettingsPageContent } from "@/components/settings-page-content";
import { getAppCopy } from "@/lib/app-copy";
import { getRequestLocale } from "@/lib/request-locale";

// Keep the Settings affordance visually stable regardless of how /settings
// was reached. Intercepting routes preserve the page underneath on a soft
// navigation, while a refresh or a document navigation has no route context
// to preserve. Both paths still present the same compact dialog, so a brief
// reload/routing fallback can never turn Settings into a full-page view.
export async function SettingsModal() {
  const locale = await getRequestLocale();
  const copy = getAppCopy(locale);

  return (
    <Modal closeLabel={copy.common.close} ariaLabel={copy.settings.title}>
      <SettingsPageContent />
    </Modal>
  );
}
