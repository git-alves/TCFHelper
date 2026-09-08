import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORT_ATTACHMENT_MAX_BYTES } from "@/lib/support-request";

const {
  getCurrentAppUserMock,
  AppUserProvisioningErrorMock,
  countMock,
  transactionMock,
  executeRawMock,
  txCountMock,
  txCreateMock,
  isHubspotConfiguredMock,
  syncSupportRequestToHubspotMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    countMock: vi.fn(),
    transactionMock: vi.fn(),
    executeRawMock: vi.fn(),
    txCountMock: vi.fn(),
    txCreateMock: vi.fn(),
    isHubspotConfiguredMock: vi.fn(),
    syncSupportRequestToHubspotMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { supportRequest: { count: countMock }, $transaction: transactionMock },
}));
vi.mock("@/lib/hubspot", () => ({
  isHubspotConfigured: isHubspotConfiguredMock,
}));
vi.mock("@/lib/support-hubspot-sync", () => ({
  syncSupportRequestToHubspot: syncSupportRequestToHubspotMock,
}));

const { POST } = await import("./route");

type SubmittedFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function supportRequest(fields: Record<string, Array<string | SubmittedFile>>): Request {
  const formData = {
    keys: function* () {
      yield* Object.keys(fields);
    },
    getAll: (name: string) => fields[name] ?? [],
  };

  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  countMock.mockReset();
  transactionMock.mockReset();
  executeRawMock.mockReset();
  txCountMock.mockReset();
  txCreateMock.mockReset();
  isHubspotConfiguredMock.mockReset();
  syncSupportRequestToHubspotMock.mockReset();

  getCurrentAppUserMock.mockResolvedValue({ id: "learner_1", email: "learner@example.com", name: "Ada Lovelace" });
  countMock.mockResolvedValue(0);
  txCountMock.mockResolvedValue(0);
  txCreateMock.mockResolvedValue({ id: "support_1" });
  executeRawMock.mockResolvedValue(undefined);
  // Sequential by default: runs the callback against a tx stub immediately.
  // The concurrency test below replaces this with a real serializing
  // implementation to prove the advisory lock is what bounds the race.
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      supportRequest: { count: txCountMock, create: txCreateMock },
    }),
  );
  isHubspotConfiguredMock.mockReturnValue(false);
});

describe("POST /api/support", () => {
  it("requires an authenticated learner before reading or storing a support request", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("fails closed while the signed-in account cannot be provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity unavailable"));

    const response = await POST(supportRequest({ category: ["QUESTION"], details: ["How do I restart? "] }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Your account is still being set up. Please try again.",
      code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
    });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a request once the learner has hit the recent-request rate limit", async () => {
    countMock.mockResolvedValue(5);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many support requests. Please try again later.",
      code: "SUPPORT_RATE_LIMITED",
    });
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(countMock).toHaveBeenCalledWith({
      where: { userId: "learner_1", createdAt: { gte: expect.any(Date) } },
    });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("never reads the request body once the rate limit is reached, bounding attachment storage abuse", async () => {
    countMock.mockResolvedValue(5);
    const formData = vi.fn();
    const request = { formData } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(formData).not.toHaveBeenCalled();
  });

  it("allows a request while under the rate limit", async () => {
    countMock.mockResolvedValue(4);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
  });

  it("acquires a per-user advisory lock before re-checking the limit inside the transaction", async () => {
    const calls: string[] = [];
    executeRawMock.mockImplementation(async () => {
      calls.push("lock");
    });
    txCountMock.mockImplementation(async () => {
      calls.push("count");
      return 0;
    });
    txCreateMock.mockImplementation(async () => {
      calls.push("create");
      return { id: "support_1" };
    });

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    expect(calls).toEqual(["lock", "count", "create"]);
    expect(executeRawMock.mock.calls[0]?.[0]?.[0]).toContain("pg_advisory_xact_lock");
  });

  it("treats the locked transaction's count as authoritative even when the pre-check optimistically passed", async () => {
    // The unlocked fast-path read observed capacity (a stale snapshot from
    // before other in-flight requests committed), but the serialized check
    // inside the transaction sees the limit has since been reached.
    countMock.mockResolvedValue(0);
    txCountMock.mockResolvedValue(5);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many support requests. Please try again later.",
      code: "SUPPORT_RATE_LIMITED",
    });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("bounds concurrent submissions from the same account to the rate limit (regression for the TOCTOU race)", async () => {
    // Models pg_advisory_xact_lock: calls to $executeRaw queue on a shared
    // key, and a caller's slot only opens for the next one once its whole
    // transaction (not just the lock call) has finished. transactionMock
    // itself runs every callback immediately, with no serialization of its
    // own -- and count() below deliberately yields a tick, so an unlocked
    // count-then-create would actually interleave here. This test only
    // passes because the route calls the lock before its count/create.
    let queueTail: Promise<void> = Promise.resolve();
    executeRawMock.mockImplementation(() => {
      const myTurn = queueTail;
      let releaseLock: () => void = () => {};
      queueTail = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      return myTurn.then(() => releaseLock);
    });

    const store: Array<{ id: string }> = [];
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      let releaseLock: (() => void) | undefined;
      const tx = {
        $executeRaw: (...args: unknown[]) =>
          (executeRawMock(...args) as Promise<() => void>).then((release) => {
            releaseLock = release;
          }),
        supportRequest: {
          count: async () => {
            await Promise.resolve();
            return store.length;
          },
          create: async () => {
            const row = { id: `support_${store.length + 1}` };
            store.push(row);
            return row;
          },
        },
      };
      try {
        return await callback(tx);
      } finally {
        releaseLock?.();
      }
    });
    // The unlocked pre-check always reports capacity: it's a stale read by
    // design, so this isolates the assertion to what the transaction alone
    // enforces.
    countMock.mockResolvedValue(0);

    const attempts = 8;
    const responses = await Promise.all(
      Array.from({ length: attempts }, () =>
        POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] })),
      ),
    );

    const accepted = responses.filter((r) => r.status === 201);
    const limited = responses.filter((r) => r.status === 429);
    expect(accepted).toHaveLength(5);
    expect(limited).toHaveLength(attempts - 5);
    expect(store).toHaveLength(5);
  });

  it("rejects malformed categories and duplicate form fields before writing", async () => {
    const response = await POST(
      supportRequest({ category: ["BUG", "QUESTION"], details: ["The editor freezes."] }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid support request." });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("persists the authenticated sender rather than accepting a sender from the browser", async () => {
    const response = await POST(
      supportRequest({ category: ["FEATURE_REQUEST_FEEDBACK"], details: ["  Add keyboard shortcuts.  "] }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "support_1" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(txCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "learner_1",
        senderEmail: "learner@example.com",
        category: "FEATURE_REQUEST_FEEDBACK",
        details: "Add keyboard shortcuts.",
      },
      select: { id: true },
    });
  });

  it("stores one accepted attachment with its actual byte length", async () => {
    const pdfBytes = new TextEncoder().encode("%PDF-1.4\n%mock pdf body used only to satisfy magic-byte sniffing");
    const file: SubmittedFile = {
      name: "steps.pdf",
      type: "application/pdf",
      size: 999,
      arrayBuffer: async () => pdfBytes.buffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(201);
    const createCall = txCreateMock.mock.calls[0]?.[0];
    expect(createCall.data.attachment.create).toMatchObject({
      originalName: "steps.pdf",
      mimeType: "application/pdf",
      byteSize: pdfBytes.byteLength,
    });
    expect(Array.from(createCall.data.attachment.create.data)).toEqual(Array.from(pdfBytes));
  });

  it("stores a genuine plain-text attachment", async () => {
    const textBytes = new TextEncoder().encode("Steps to reproduce:\n1. Open the editor\n2. Freeze");
    const file: SubmittedFile = {
      name: "steps.txt",
      type: "text/plain",
      size: textBytes.byteLength,
      arrayBuffer: async () => textBytes.buffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(201);
    expect(txCreateMock.mock.calls[0]?.[0].data.attachment.create).toMatchObject({
      originalName: "steps.txt",
      mimeType: "text/plain",
    });
  });

  it("rejects an attachment whose content doesn't match its claimed type", async () => {
    // MZ header: a Windows executable renamed to look like a PDF.
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    const file: SubmittedFile = {
      name: "steps.pdf",
      type: "application/pdf",
      size: exeBytes.byteLength,
      arrayBuffer: async () => exeBytes.buffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid attachment." });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a binary file disguised with a .txt extension", async () => {
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const file: SubmittedFile = {
      name: "notes.txt",
      type: "text/plain",
      size: pngBytes.byteLength,
      arrayBuffer: async () => pngBytes.buffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid attachment." });
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized attachment before reading it or writing a request", async () => {
    const arrayBuffer = vi.fn();
    const file: SubmittedFile = {
      name: "too-large.pdf",
      type: "application/pdf",
      size: SUPPORT_ATTACHMENT_MAX_BYTES + 1,
      arrayBuffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid attachment." });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(txCreateMock).not.toHaveBeenCalled();
  });

  it("does not expose persistence errors containing a learner's support message", async () => {
    txCreateMock.mockRejectedValue(new Error("database rejected the sensitive details"));

    const response = await POST(supportRequest({ category: ["OTHER"], details: ["private report"] }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Support is temporarily unavailable. Please try again.",
    });
  });

  it("fails closed with the sanitized 503 when the rate-limit pre-check itself errors", async () => {
    countMock.mockRejectedValue(new Error("connection to database lost"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(supportRequest({ category: ["OTHER"], details: ["private report"] }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Support is temporarily unavailable. Please try again.",
    });
    expect(transactionMock).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("skips HubSpot sync entirely when it isn't configured", async () => {
    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    expect(syncSupportRequestToHubspotMock).not.toHaveBeenCalled();
  });

  it("mirrors a newly created request to HubSpot with no prior progress", async () => {
    isHubspotConfiguredMock.mockReturnValue(true);
    syncSupportRequestToHubspotMock.mockResolvedValue(undefined);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    expect(syncSupportRequestToHubspotMock).toHaveBeenCalledWith({
      id: "support_1",
      senderEmail: "learner@example.com",
      senderName: "Ada Lovelace",
      category: "BUG",
      details: "The editor freezes.",
      hubspotTicketId: null,
      hubspotAttachmentFileId: null,
      hubspotAttachmentSyncedAt: null,
      attachment: null,
    });
  });

  it("still returns success to the learner when HubSpot sync fails", async () => {
    isHubspotConfiguredMock.mockReturnValue(true);
    syncSupportRequestToHubspotMock.mockRejectedValue(new Error("HubSpot is down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "support_1" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("HubSpot support sync failed", "HubSpot is down");

    consoleErrorSpy.mockRestore();
  });
});
