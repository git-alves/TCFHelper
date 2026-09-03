import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isHubspotConfigured, syncSupportRequestToHubspot } from "./hubspot";

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

describe("syncSupportRequestToHubspot", () => {
  it("upserts the contact by email, creates a ticket, and associates them", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "contact_1" }] }))
      .mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }))
      .mockResolvedValueOnce(jsonResponse(undefined));

    const result = await syncSupportRequestToHubspot({
      senderEmail: "learner@example.com",
      senderName: "Ada Lovelace",
      category: "BUG",
      details: "The editor freezes.",
      attachment: null,
    });

    expect(result).toEqual({ ticketId: "ticket_1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [contactUrl, contactInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(contactUrl).toBe("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert");
    expect(contactInit.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(JSON.parse(contactInit.body as string)).toEqual({
      inputs: [
        {
          idProperty: "email",
          id: "learner@example.com",
          properties: { email: "learner@example.com", firstname: "Ada", lastname: "Lovelace" },
        },
      ],
    });

    const [ticketUrl, ticketInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(ticketUrl).toBe("https://api.hubapi.com/crm/v3/objects/tickets");
    expect(JSON.parse(ticketInit.body as string)).toEqual({
      properties: {
        subject: "[Bug] Support request from learner@example.com",
        content: "The editor freezes.",
        hs_pipeline: "0",
        hs_pipeline_stage: "1",
      },
    });

    const [associationUrl, associationInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(associationUrl).toBe(
      "https://api.hubapi.com/crm/v4/objects/tickets/ticket_1/associations/default/contacts/contact_1",
    );
    expect(associationInit.method).toBe("PUT");
  });

  it("uploads an attachment and attaches it to the ticket via a note", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "contact_1" }] }))
      .mockResolvedValueOnce(jsonResponse({ id: "ticket_1" }))
      .mockResolvedValueOnce(jsonResponse(undefined))
      .mockResolvedValueOnce(jsonResponse({ id: "file_1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "note_1" }))
      .mockResolvedValueOnce(jsonResponse(undefined))
      .mockResolvedValueOnce(jsonResponse(undefined));

    await syncSupportRequestToHubspot({
      senderEmail: "learner@example.com",
      senderName: null,
      category: "OTHER",
      details: "See attached.",
      attachment: { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(7);

    const [fileUrl, fileInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(fileUrl).toBe("https://api.hubapi.com/files/v3/files");
    expect(fileInit.body).toBeInstanceOf(FormData);

    const [noteUrl, noteInit] = fetchMock.mock.calls[4] as [string, RequestInit];
    expect(noteUrl).toBe("https://api.hubapi.com/crm/v3/objects/notes");
    const noteBody = JSON.parse(noteInit.body as string);
    expect(noteBody.properties.hs_attachment_ids).toBe("file_1");

    const [noteTicketAssocUrl] = fetchMock.mock.calls[5] as [string, RequestInit];
    expect(noteTicketAssocUrl).toBe(
      "https://api.hubapi.com/crm/v4/objects/notes/note_1/associations/default/tickets/ticket_1",
    );
    const [noteContactAssocUrl] = fetchMock.mock.calls[6] as [string, RequestInit];
    expect(noteContactAssocUrl).toBe(
      "https://api.hubapi.com/crm/v4/objects/notes/note_1/associations/default/contacts/contact_1",
    );
  });

  it("respects pipeline overrides and rejects a non-2xx response", async () => {
    process.env.HUBSPOT_TICKET_PIPELINE_ID = "42";
    process.env.HUBSPOT_TICKET_PIPELINE_STAGE_ID = "7";
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "contact_1" }] }))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));

    await expect(
      syncSupportRequestToHubspot({
        senderEmail: "learner@example.com",
        senderName: null,
        category: "QUESTION",
        details: "Why?",
        attachment: null,
      }),
    ).rejects.toThrow(/failed with 500/);

    const [, ticketInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(ticketInit.body as string).properties).toMatchObject({
      hs_pipeline: "42",
      hs_pipeline_stage: "7",
    });
  });

  it("throws if HUBSPOT_ACCESS_TOKEN is missing", async () => {
    delete process.env.HUBSPOT_ACCESS_TOKEN;
    await expect(
      syncSupportRequestToHubspot({
        senderEmail: "learner@example.com",
        senderName: null,
        category: "OTHER",
        details: "Hi.",
        attachment: null,
      }),
    ).rejects.toThrow("HUBSPOT_ACCESS_TOKEN is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
