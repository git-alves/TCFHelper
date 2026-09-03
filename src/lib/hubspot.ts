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

// The v4 "default" association endpoint resolves the correct HubSpot-defined
// association type for a given object pair on its own, so callers never need
// to hardcode a numeric association type id.
async function associateDefault(from: { type: string; id: string }, to: { type: string; id: string }) {
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

async function upsertHubspotContact({ email, name }: { email: string; name: string | null }): Promise<string> {
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

async function createHubspotTicket({
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

async function uploadHubspotFile({
  data,
  fileName,
  mimeType,
}: {
  data: Uint8Array;
  fileName: string;
  mimeType: string;
}): Promise<string> {
  const token = requireHubspotAccessToken();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type: mimeType }), fileName);
  form.append("options", JSON.stringify({ access: "PRIVATE" }));
  form.append("folderPath", "/support-tickets");

  const response = await fetch(`${HUBSPOT_API_BASE}/files/v3/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`HubSpot file upload failed with ${response.status}`);
  }
  const uploaded = (await response.json()) as { id: string };
  return uploaded.id;
}

async function attachHubspotFileToTicket({
  fileId,
  fileName,
  ticketId,
  contactId,
}: {
  fileId: string;
  fileName: string;
  ticketId: string;
  contactId: string;
}): Promise<void> {
  const note = await hubspotJson<{ id: string }>("/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: Date.now(),
        hs_note_body: `Attachment from support request: ${fileName}`,
        hs_attachment_ids: fileId,
      },
    }),
  });
  await associateDefault({ type: "notes", id: note.id }, { type: "tickets", id: ticketId });
  await associateDefault({ type: "notes", id: note.id }, { type: "contacts", id: contactId });
}

export type HubspotSupportSyncInput = {
  senderEmail: string;
  senderName: string | null;
  category: SupportCategory;
  details: string;
  attachment?: { data: Uint8Array; originalName: string; mimeType: string } | null;
};

// Best-effort mirror of a stored support request into HubSpot as a ticket
// linked to a contact, with any attachment reachable from the ticket's
// timeline. The local SupportRequest row is always the source of truth --
// callers should not fail the learner's submission if this throws.
export async function syncSupportRequestToHubspot(
  input: HubspotSupportSyncInput,
): Promise<{ ticketId: string }> {
  const contactId = await upsertHubspotContact({ email: input.senderEmail, name: input.senderName });
  const ticketId = await createHubspotTicket({
    category: input.category,
    details: input.details,
    senderEmail: input.senderEmail,
  });
  await associateDefault({ type: "tickets", id: ticketId }, { type: "contacts", id: contactId });

  if (input.attachment) {
    const fileId = await uploadHubspotFile({
      data: input.attachment.data,
      fileName: input.attachment.originalName,
      mimeType: input.attachment.mimeType,
    });
    await attachHubspotFileToTicket({
      fileId,
      fileName: input.attachment.originalName,
      ticketId,
      contactId,
    });
  }

  return { ticketId };
}
