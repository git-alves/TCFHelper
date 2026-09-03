import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  associateHubspotDefault,
  attachHubspotFile,
  createHubspotTicket,
  isHubspotConfigured,
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
});

describe("createHubspotTicket", () => {
  it("defaults to the default portal pipeline and stage", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }));

    const ticketId = await createHubspotTicket({
      category: "BUG",
      details: "The editor freezes.",
      senderEmail: "learner@example.com",
    });

    expect(ticketId).toBe("ticket_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/tickets");
    expect(JSON.parse(init.body as string)).toEqual({
      properties: {
        subject: "[Bug] Support request from learner@example.com",
        content: "The editor freezes.",
        hs_pipeline: "0",
        hs_pipeline_stage: "1",
      },
    });
  });

  it("respects pipeline/stage overrides and rejects a non-2xx response", async () => {
    process.env.HUBSPOT_TICKET_PIPELINE_ID = "42";
    process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID = "7";
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    await expect(
      createHubspotTicket({ category: "QUESTION", details: "Why?", senderEmail: "learner@example.com" }),
    ).rejects.toThrow(/failed with 500/);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).properties).toMatchObject({
      hs_pipeline: "42",
      hs_pipeline_stage: "7",
    });
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

describe("attachHubspotFile", () => {
  it("uploads the file, creates a note referencing it, and associates the note", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "file_1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "note_1" }))
      .mockResolvedValueOnce(jsonResponse(undefined))
      .mockResolvedValueOnce(jsonResponse(undefined));

    await attachHubspotFile({
      ticketId: "ticket_1",
      contactId: "contact_1",
      attachment: { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);

    const [fileUrl, fileInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(fileUrl).toBe("https://api.hubapi.com/files/v3/files");
    expect(fileInit.body).toBeInstanceOf(FormData);

    const [noteUrl, noteInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(noteUrl).toBe("https://api.hubapi.com/crm/v3/objects/notes");
    expect(JSON.parse(noteInit.body as string).properties.hs_attachment_ids).toBe("file_1");

    const [noteTicketAssocUrl] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(noteTicketAssocUrl).toBe(
      "https://api.hubapi.com/crm/v4/objects/notes/note_1/associations/default/tickets/ticket_1",
    );
    const [noteContactAssocUrl] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(noteContactAssocUrl).toBe(
      "https://api.hubapi.com/crm/v4/objects/notes/note_1/associations/default/contacts/contact_1",
    );
  });

  it("rejects when the file upload itself fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    await expect(
      attachHubspotFile({
        ticketId: "ticket_1",
        contactId: "contact_1",
        attachment: { data: new Uint8Array([1]), originalName: "log.txt", mimeType: "text/plain" },
      }),
    ).rejects.toThrow(/upload failed with 500/);
  });
});
