import { SettingsModal } from "@/components/settings-modal";

// A refresh/direct navigation cannot be intercepted by Next, but it must
// retain the Settings dialog's compact form rather than unexpectedly taking
// over the page. The modal's close action still returns through browser
// history, the same as a soft-navigation modal.
export default async function SettingsPage() {
  return <SettingsModal />;
}
