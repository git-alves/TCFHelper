import { SettingsModal } from "@/components/settings-modal";

// Intercepts client-side navigation to /settings so it opens over whatever
// page the learner was on. The direct-route fallback uses this identical
// compact shell, too; only the preserved background differs.
export default async function InterceptedSettingsModal() {
  return <SettingsModal />;
}
