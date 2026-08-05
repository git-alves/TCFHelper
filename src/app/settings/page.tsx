import { SettingsForm } from "@/components/settings-form";

// Available regardless of sign-in state, like the language picker: a
// learner should be able to fix a mismatched theme (including on the
// sign-in/sign-up screens) before creating an account.
export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SettingsForm />
    </main>
  );
}
