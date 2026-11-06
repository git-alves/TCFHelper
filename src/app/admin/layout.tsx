import { AdminPromptsNavGuardProvider } from "@/components/admin-prompts-nav-guard";
import { AdminSidebar } from "@/components/admin-sidebar";

// Every /admin/* page checks admin access itself (a layout doesn't re-render
// on client navigation, so it can't be the gate); this only supplies the shared
// section navigation. The unsaved-prompt guard is provided here so the sidebar
// links -- which outlive any single page -- can read the prompts form's state.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPromptsNavGuardProvider>
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AdminPromptsNavGuardProvider>
  );
}
