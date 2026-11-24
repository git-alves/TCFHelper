"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution-limits";
export function AdminSupportEditReply({ requestId, note }: { requestId: string; note: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [value, setValue] = useState(note ?? ""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function save() { if (saving) return; setSaving(true); setError(null); try { const response = await fetch(`/api/admin/support/${requestId}/reply`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: value }) }); if (response.ok) { setOpen(false); router.refresh(); return; } const body = await response.json().catch(() => null) as { error?: string } | null; setError(body?.error ?? "Could not edit this reply. Please try again."); if (response.status === 409) router.refresh(); } catch { setError("Could not edit this reply. Please try again."); } finally { setSaving(false); } }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs font-medium text-violet-700 underline dark:text-violet-300">Edit reply</button>;
  return <div className="mt-2 flex max-w-md flex-col gap-2"><label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Reply to the learner</label><textarea aria-label="Reply to the learner" value={value} onChange={(event) => setValue(event.target.value)} maxLength={SUPPORT_RESOLUTION_NOTE_MAX_CHARS} rows={3} disabled={saving} className="rounded-lg border border-black/[.15] bg-background p-2 text-sm dark:border-white/[.2]" /><div className="flex gap-2"><button type="button" onClick={() => void save()} disabled={saving} className="rounded bg-violet-700 px-3 py-1 text-xs text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button><button type="button" onClick={() => { setOpen(false); setError(null); }} disabled={saving} className="text-xs underline">Cancel</button></div>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
