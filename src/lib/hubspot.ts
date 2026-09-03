import type { SupportCategory } from "@/lib/support-request";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Every ticket/note this integration creates carries this property, set to
// the local SupportRequest id, and the property is provisioned with
// hasUniqueValue: true. That turns "create a ticket/note for this support
// request" into an operation HubSpot itself will reject as a 409 conflict if
// it has already happened -- which is what makes createHubspotTicket and
// createHubspotAttachmentNote safe to call more than once (by a retry, or by
// two callers racing each other) for the same request.
const SUPPORT_REQUEST_ID_PROPERTY = "support_request_id";

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

export class HubspotHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HubspotHttpError";
  }
}

// HubSpot's scope catalog has changed shape over time and is easy to get
// wrong from documentation alone, so a 401/403 body -- which is always
// HubSpot's own diagnostic about the token/app, e.g. "This app hasn't been
// granted all required scopes" -- is worth surfacing verbatim. Every other
// status keeps a terse message instead: those bodies can echo back the
// value that failed validation, which may be the learner's own submitted
// text, so they're not safe to log.
async function hubspotErrorDetail(response: Response): Promise<string> {
  if (response.status !== 401 && response.status !== 403) return "";
  const body = await response.text().catch(() => "");
  return body ? `: ${body.slice(0, 500)}` : "";
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
    const detail = await hubspotErrorDetail(response);
    throw new HubspotHttpError(
      `HubSpot ${init.method ?? "GET"} ${path} failed with ${response.status}${detail}`,
      response.status,
    );
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

async function hubspotPropertyExists(objectType: string, propertyName: string): Promise<boolean> {
  const token = requireHubspotAccessToken();
  const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/${objectType}/${propertyName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const detail = await hubspotErrorDetail(response);
    throw new HubspotHttpError(
      `HubSpot GET property ${objectType}/${propertyName} failed with ${response.status}${detail}`,
      response.status,
    );
  }
  return true;
}

async function firstHubspotPropertyGroup(objectType: string): Promise<string> {
  const body = await hubspotJson<{ results: Array<{ name: string }> }>(`/crm/v3/properties/${objectType}/groups`);
  const groupName = body.results[0]?.name;
  if (!groupName) throw new Error(`HubSpot portal has no property groups for ${objectType}`);
  return groupName;
}

// Provisions the dedupe-key property used by findOrCreate* below, on
// whichever object type needs it, the first time it's needed. Safe to call
// repeatedly (including concurrently): once the property exists this is a
// single cheap GET, and the create-if-missing race resolves through the same
// 409-means-already-there handling as the objects that use the property.
async function ensureSupportRequestIdProperty(objectType: string): Promise<void> {
  if (await hubspotPropertyExists(objectType, SUPPORT_REQUEST_ID_PROPERTY)) return;

  const groupName = await firstHubspotPropertyGroup(objectType);
  try {
    await hubspotJson(`/crm/v3/properties/${objectType}`, {
      method: "POST",
      body: JSON.stringify({
        name: SUPPORT_REQUEST_ID_PROPERTY,
        label: "Support request ID",
        type: "string",
        fieldType: "text",
        groupName,
        hasUniqueValue: true,
      }),
    });
  } catch (error) {
    if (!(error instanceof HubspotHttpError) || error.status !== 409) throw error;
  }
}

// HubSpot's CRM Search index is only eventually consistent, so the object a
// 409 just told us exists may not be searchable yet. Retrying briefly covers
// the normal case; if it still isn't found, the caller fails this attempt
// (recorded for the retry cron) rather than risking a duplicate by creating
// anyway.
async function findHubspotObjectByProperty(
  objectType: string,
  value: string,
  retries = 3,
): Promise<string | null> {
  for (let attempt = 0; ; attempt += 1) {
    const body = await hubspotJson<{ results: Array<{ id: string }> }>(`/crm/v3/objects/${objectType}/search`, {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: SUPPORT_REQUEST_ID_PROPERTY, operator: "EQ", value }] }],
        properties: ["hs_object_id"],
        limit: 1,
      }),
    });
    const id = body.results[0]?.id;
    if (id || attempt >= retries) return id ?? null;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
}

// Idempotent per supportRequestId: HubSpot enforces uniqueness on
// support_request_id server-side, so if two callers race (the initial
// synchronous submit and a retry cron pass, say) or a retry follows a crash
// right after HubSpot accepted the create, the loser's create gets a 409 and
// this looks up the winner's ticket instead of creating a second one.
export async function findOrCreateHubspotTicket({
  supportRequestId,
  category,
  details,
  senderEmail,
}: {
  supportRequestId: string;
  category: SupportCategory;
  details: string;
  senderEmail: string;
}): Promise<string> {
  await ensureSupportRequestIdProperty("tickets");

  // A brand-new HubSpot portal's default ticket pipeline uses these ids;
  // both are overridable for portals with a customized support pipeline.
  const pipeline = process.env.HUBSPOT_TICKET_PIPELINE_ID?.trim() || "0";
  const stage = process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID?.trim() || "1";
  try {
    const body = await hubspotJson<{ id: string }>("/crm/v3/objects/tickets", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          [SUPPORT_REQUEST_ID_PROPERTY]: supportRequestId,
          subject: `[${CATEGORY_LABELS[category]}] Support request from ${senderEmail}`,
          content: details,
          hs_pipeline: pipeline,
          hs_pipeline_stage: stage,
        },
      }),
    });
    return body.id;
  } catch (error) {
    if (error instanceof HubspotHttpError && error.status === 409) {
      const existing = await findHubspotObjectByProperty("tickets", supportRequestId);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function uploadHubspotFile({
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
    const detail = await hubspotErrorDetail(response);
    throw new HubspotHttpError(`HubSpot file upload failed with ${response.status}${detail}`, response.status);
  }
  const uploaded = (await response.json()) as { id: string };
  return uploaded.id;
}

// Idempotent per supportRequestId, the same way findOrCreateHubspotTicket is.
// The uploaded file itself can't carry a dedupe key (the Files API has no
// custom properties), so callers should persist the id returned by
// uploadHubspotFile before calling this, and skip re-uploading on a retry --
// that leaves at most one harmless orphaned file in HubSpot if a retry
// follows a crash between the upload and this call, never a duplicate note
// or attachment visible on the ticket.
export async function findOrCreateHubspotAttachmentNote({
  supportRequestId,
  fileId,
  fileName,
}: {
  supportRequestId: string;
  fileId: string;
  fileName: string;
}): Promise<string> {
  await ensureSupportRequestIdProperty("notes");

  try {
    const note = await hubspotJson<{ id: string }>("/crm/v3/objects/notes", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          [SUPPORT_REQUEST_ID_PROPERTY]: supportRequestId,
          hs_timestamp: Date.now(),
          hs_note_body: `Attachment from support request: ${fileName}`,
          hs_attachment_ids: fileId,
        },
      }),
    });
    return note.id;
  } catch (error) {
    if (error instanceof HubspotHttpError && error.status === 409) {
      const existing = await findHubspotObjectByProperty("notes", supportRequestId);
      if (existing) return existing;
    }
    throw error;
  }
}
