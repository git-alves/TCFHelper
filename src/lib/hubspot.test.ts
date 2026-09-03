import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  associateHubspotDefault,
  findOrCreateHubspotAttachmentNote,
  findOrCreateHubspotTicket,
  isHubspotConfigured,
  uploadHubspotFile,
  upsertHubspotContact,
} from "./hubspot";

const fetchMock = vi.fn();
const originalToken = process.env.HUBSPOT_ACCESS_TOKEN;
const originalPipeline = process.env.HUBSPOT_TICKET_PIPELINE_ID;
const originalStage = process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token";
  delete process.env.HUBSPOT_TICKET_PIPELINE_ID;
  delete process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalToken === undefined) delete process.env.HUBSPOT_ACCESS_TOKEN;
  else process.env.HUBSPOT_ACCESS_TOKEN = originalToken;
  if (originalPipeline === undefined) delete process.env.HUBSPOT_TICKET_PIPELINE_ID;
  else process.env.HUBSPOT_TICKET_PIPELINE_ID = originalPipeline;
  if (originalStage === undefined) delete process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID;
  else process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID = originalStage;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? "" : JSON.stringify(body), { status });
}

function propertyExistsResponse() {
  return jsonResponse({ name: "support_request_id" });
}

function propertyMissingResponse() {
  return new Response("not found", { status: 404 });
}

describe("isHubspotConfigured", () => {
  it("is false without an access token", () => {
    delete process.env.HUBSPOT_ACCESS_TOKEN;
    expect(isHubspotConfigured()).toBe(false);
  });

  it("is true once an access token is set", () => {
    expect(isHubspotConfigured()).toBe(true);
  });
});

describe("upsertHubspotContact", () => {
  it("upserts by email and splits the account name into first/last", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ id: "contact_1" }] }));

    const contactId = await upsertHubspotContact({ email: "learner@example.com", name: "Ada Lovelace" });

    expect(contactId).toBe("contact_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(JSON.parse(init.body as string)).toEqual({
      inputs: [
        {
          idProperty: "email",
          id: "learner@example.com",
          properties: { email: "learner@example.com", firstname: "Ada", lastname: "Lovelace" },
        },
      ],
    });
  });

  it("omits name properties when there is no account name", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ id: "contact_1" }] }));

    await upsertHubspotContact({ email: "learner@example.com", name: null });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).inputs[0].properties).toEqual({ email: "learner@example.com" });
  });

  it("throws if the access token is missing", async () => {
    delete process.env.HUBSPOT_ACCESS_TOKEN;
    await expect(upsertHubspotContact({ email: "learner@example.com", name: null })).rejects.toThrow(
      "HUBSPOT_ACCESS_TOKEN is not set",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces HubSpot's own message on a 403 to make missing scopes diagnosable", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"message":"This app hasn\'t been granted all required scopes: tickets"}', { status: 403 }),
    );

    await expect(upsertHubspotContact({ email: "learner@example.com", name: null })).rejects.toThrow(
      /failed with 403: .*required scopes/i,
    );
  });

  it("does not include the response body for a non-auth failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("possibly-sensitive-field-echo", { status: 400 }));

    const error = await upsertHubspotContact({ email: "learner@example.com", name: null }).catch((e: Error) => e);

    expect((error as Error).message).toBe(
      "HubSpot POST /crm/v3/objects/contacts/batch/upsert failed with 400",
    );
  });
});

describe("findOrCreateHubspotTicket", () => {
  const input = { supportRequestId: "support_1", category: "BUG" as const, details: "The editor freezes.", senderEmail: "learner@example.com" };

  it("provisions the dedupe property when missing, then creates the ticket carrying it", async () => {
    fetchMock
      .mockResolvedValueOnce(propertyMissingResponse())
      .mockResolvedValueOnce(jsonResponse({ results: [{ name: "ticketinformation" }] }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }));

    const ticketId = await findOrCreateHubspotTicket(input);

    expect(ticketId).toBe("ticket_1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.hubapi.com/crm/v3/properties/tickets/support_request_id");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.hubapi.com/crm/v3/properties/tickets/groups");
    const [propUrl, propInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(propUrl).toBe("https://api.hubapi.com/crm/v3/properties/tickets");
    expect(JSON.parse(propInit.body as string)).toMatchObject({
      name: "support_request_id",
      groupName: "ticketinformation",
      hasUniqueValue: true,
    });
    const [ticketUrl, ticketInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(ticketUrl).toBe("https://api.hubapi.com/crm/v3/objects/tickets");
    expect(JSON.parse(ticketInit.body as string)).toEqual({
      properties: {
        support_request_id: "support_1",
        subject: "[Bug] Support request from learner@example.com",
        content: "The editor freezes.",
        hs_pipeline: "0",
        hs_pipeline_stage: "1",
      },
    });
  });

  it("skips provisioning when the dedupe property already exists", async () => {
    fetchMock.mockResolvedValueOnce(propertyExistsResponse()).mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }));

    await findOrCreateHubspotTicket(input);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a 409 while provisioning the property as already-created by a concurrent worker", async () => {
    fetchMock
      .mockResolvedValueOnce(propertyMissingResponse())
      .mockResolvedValueOnce(jsonResponse({ results: [{ name: "ticketinformation" }] }))
      .mockResolvedValueOnce(new Response("conflict", { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }));

    const ticketId = await findOrCreateHubspotTicket(input);
    expect(ticketId).toBe("ticket_1");
  });

  it("respects pipeline/stage overrides", async () => {
    process.env.HUBSPOT_TICKET_PIPELINE_ID = "42";
    process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID = "7";
    fetchMock.mockResolvedValueOnce(propertyExistsResponse()).mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }));

    await findOrCreateHubspotTicket(input);

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string).properties).toMatchObject({ hs_pipeline: "42", hs_pipeline_stage: "7" });
  });

  it("looks up the existing ticket on a 409 conflict instead of creating a duplicate", async () => {
    fetchMock
      .mockResolvedValueOnce(propertyExistsResponse())
      .mockResolvedValueOnce(new Response("conflict", { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "ticket_existing" }] }));

    const ticketId = await findOrCreateHubspotTicket(input);

    expect(ticketId).toBe("ticket_existing");
    const [searchUrl, searchInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(searchUrl).toBe("https://api.hubapi.com/crm/v3/objects/tickets/search");
    expect(JSON.parse(searchInit.body as string)).toEqual({
      filterGroups: [{ filters: [{ propertyName: "support_request_id", operator: "EQ", value: "support_1" }] }],
      properties: ["hs_object_id"],
      limit: 1,
    });
  });

  it("retries the search briefly if HubSpot's index hasn't caught up yet", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(propertyExistsResponse())
      .mockResolvedValueOnce(new Response("conflict", { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "ticket_existing" }] }));

    const promise = findOrCreateHubspotTicket(input);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("ticket_existing");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("rethrows the 409 if the conflicting ticket can never be found", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(propertyExistsResponse()).mockResolvedValueOnce(new Response("conflict", { status: 409 }));
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ results: [] })));

    const promise = findOrCreateHubspotTicket(input);
    const expectation = expect(promise).rejects.toThrow(/failed with 409/);
    await vi.runAllTimersAsync();
    await expectation;
  });
});

describe("uploadHubspotFile", () => {
  it("uploads the file as multipart form data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "file_1" }));

    const fileId = await uploadHubspotFile({
      data: new Uint8Array([1, 2, 3]),
      fileName: "log.txt",
      mimeType: "text/plain",
    });

    expect(fileId).toBe("file_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/files/v3/files");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("rejects when the upload fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    await expect(
      uploadHubspotFile({ data: new Uint8Array([1]), fileName: "log.txt", mimeType: "text/plain" }),
    ).rejects.toThrow(/upload failed with 500/);
  });
});

describe("findOrCreateHubspotAttachmentNote", () => {
  const input = { supportRequestId: "support_1", fileId: "file_1", fileName: "log.txt" };

  it("creates a note carrying the dedupe property and referencing the file", async () => {
    fetchMock.mockResolvedValueOnce(propertyExistsResponse()).mockResolvedValueOnce(jsonResponse({ id: "note_1" }));

    const noteId = await findOrCreateHubspotAttachmentNote(input);

    expect(noteId).toBe("note_1");
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/notes");
    expect(JSON.parse(init.body as string).properties).toMatchObject({
      support_request_id: "support_1",
      hs_attachment_ids: "file_1",
    });
  });

  it("looks up the existing note on a 409 conflict instead of creating a duplicate", async () => {
    fetchMock
      .mockResolvedValueOnce(propertyExistsResponse())
      .mockResolvedValueOnce(new Response("conflict", { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "note_existing" }] }));

    const noteId = await findOrCreateHubspotAttachmentNote(input);
    expect(noteId).toBe("note_existing");
  });
});

describe("associateHubspotDefault", () => {
  it("PUTs to the v4 default-association endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(undefined));

    await associateHubspotDefault({ type: "tickets", id: "ticket_1" }, { type: "contacts", id: "contact_1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.hubapi.com/crm/v4/objects/tickets/ticket_1/associations/default/contacts/contact_1",
    );
    expect(init.method).toBe("PUT");
  });
});
