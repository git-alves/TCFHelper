import { SettingsModal } from "@/components/settings-modal";

// A refresh/direct navigation cannot be intercepted by Next, but it must
// retain the Settings dialog's compact form rather than unexpectedly taking
// over the page. There is no underlying route to reveal in that case, so
// close returns learners to their dashboard instead of potentially leaving
// the app through browser history.
export default async function SettingsPage() {
  return <SettingsModal fallbackCloseHref="/dashboard" />;
}
