import type { SupportCategory } from "@/lib/support-request";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  BUG: "Bug",
  QUESTION: "Question",
  FEATURE_REQUEST_FEEDBACK: "Feature request / feedback",
  ACCOUNT_ACCESS: "Account & access",
  OTHER: "Other",
};

export function isHubspotConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_ACCESS_TOKEN);
}

function requireHubspotAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is not set");
  return token;
}

async function hubspotJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = requireHubspotAccessToken();
  const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HubSpot ${init.method ?? "GET"} ${path} failed with ${response.status}`);
  }
  // Some endpoints (e.g. the v4 default-association PUT) can return an empty
  // body on success, so don't assume every 2xx response is parseable JSON.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

type HubspotObjectRef = { type: string; id: string };

// The v4 "default" association endpoint resolves the correct HubSpot-defined
// association type for a given object pair on its own, so callers never need
// to hardcode a numeric association type id. It's also safe to call more
// than once for the same pair -- HubSpot treats re-creating an existing
// default association as a no-op, which is what makes every retry below safe.
export async function associateHubspotDefault(from: HubspotObjectRef, to: HubspotObjectRef): Promise<void> {
  await hubspotJson(`/crm/v4/objects/${from.type}/${from.id}/associations/default/${to.type}/${to.id}`, {
    method: "PUT",
  });
}

function splitName(name: string | null): { firstname?: string; lastname?: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const [firstname, ...rest] = parts;
  return rest.length > 0 ? { firstname, lastname: rest.join(" ") } : { firstname };
}

// Keyed on email via idProperty, so calling this again for the same learner
// (e.g. on a retry) updates the same contact rather than creating another.
export async function upsertHubspotContact({
  email,
  name,
}: {
  email: string;
  name: string | null;
}): Promise<string> {
  const body = await hubspotJson<{ results: Array<{ id: string }> }>("/crm/v3/objects/contacts/batch/upsert", {
    method: "POST",
    body: JSON.stringify({
      inputs: [
        {
          idProperty: "email",
          id: email,
          properties: { email, ...splitName(name) },
        },
      ],
    }),
  });
  const contactId = body.results[0]?.id;
  if (!contactId) throw new Error("HubSpot contact upsert returned no id");
  return contactId;
}

// Not idempotent -- each call creates a new ticket. Callers must persist the
// returned id and pass it through on any retry instead of calling this again
// for the same support request.
export async function createHubspotTicket({
  category,
  details,
  senderEmail,
}: {
  category: SupportCategory;
  details: string;
  senderEmail: string;
}): Promise<string> {
  // A brand-new HubSpot portal's default ticket pipeline uses these ids;
  // both are overridable for portals with a customized support pipeline.
  const pipeline = process.env.HUBSPOT_TICKET_PIPELINE_ID?.trim() || "0";
  const stage = process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID?.trim() || "1";
  const body = await hubspotJson<{ id: string }>("/crm/v3/objects/tickets", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        subject: `[${CATEGORY_LABELS[category]}] Support request from ${senderEmail}`,
        content: details,
        hs_pipeline: pipeline,
        hs_pipeline_stage: stage,
      },
    }),
  });
  return body.id;
}

// Not idempotent -- each call uploads another copy of the file and creates
// another note. Callers must track completion (e.g.
// SupportRequest.hubspotAttachmentSyncedAt) and skip calling this again once
// it has succeeded for a given support request.
export async function attachHubspotFile({
  ticketId,
  contactId,
  attachment,
}: {
  ticketId: string;
  contactId: string;
  attachment: { data: Uint8Array; originalName: string; mimeType: string };
}): Promise<void> {
  const token = requireHubspotAccessToken();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(attachment.data)], { type: attachment.mimeType }), attachment.originalName);
  form.append("options", JSON.stringify({ access: "PRIVATE" }));
  form.append("folderPath", "/support-tickets");

  const uploadResponse = await fetch(`${HUBSPOT_API_BASE}/files/v3/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error(`HubSpot file upload failed with ${uploadResponse.status}`);
  }
  const uploaded = (await uploadResponse.json()) as { id: string };

  const note = await hubspotJson<{ id: string }>("/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: Date.now(),
        hs_note_body: `Attachment from support request: ${attachment.originalName}`,
        hs_attachment_ids: uploaded.id,
      },
    }),
  });
  await associateHubspotDefault({ type: "notes", id: note.id }, { type: "tickets", id: ticketId });
  await associateHubspotDefault({ type: "notes", id: note.id }, { type: "contacts", id: contactId });
}
