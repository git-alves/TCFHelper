"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution-limits";
export function AdminSupportEditReply({ requestId, note }: { requestId: string; note: string | null }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [value, setValue] = useState(note ?? ""); const [error, setError] = useState<string | null>(null);
  async function save() { setError(null); const response = await fetch(`/api/admin/support/${requestId}/reply`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: value }) }); if (response.ok) { setOpen(false); router.refresh(); return; } const body = await response.json().catch(() => null) as { error?: string } | null; setError(body?.error ?? "Could not edit this reply."); if (response.status === 409) router.refresh(); }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs font-medium text-violet-700 underline dark:text-violet-300">Edit reply</button>;
  return <div className="mt-2 flex max-w-md flex-col gap-2"><textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={SUPPORT_RESOLUTION_NOTE_MAX_CHARS} rows={3} className="rounded border p-2 text-sm" /><div className="flex gap-2"><button type="button" onClick={() => void save()} className="rounded bg-violet-700 px-3 py-1 text-xs text-white">Save</button><button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-xs underline">Cancel</button></div>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
