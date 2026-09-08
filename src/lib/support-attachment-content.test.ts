import { describe, expect, it } from "vitest";
import { attachmentContentMatchesDeclaredType } from "./support-attachment-content";

describe("attachmentContentMatchesDeclaredType", () => {
  it("accepts a real PDF", async () => {
    const data = new TextEncoder().encode("%PDF-1.4\nsome body content padding padding padding");
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.pdf", mimeType: "application/pdf", data }),
    ).resolves.toBe(true);
  });

  it("accepts a real PNG", async () => {
    const data = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.png", mimeType: "image/png", data }),
    ).resolves.toBe(true);
  });

  it("accepts a real zip regardless of the declared zip MIME variant", async () => {
    const data = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(20).fill(0)]);
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.zip", mimeType: "application/x-zip-compressed", data }),
    ).resolves.toBe(true);
  });

  it("accepts genuine plain text", async () => {
    const data = new TextEncoder().encode("just some notes about a bug");
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.txt", mimeType: "text/plain", data }),
    ).resolves.toBe(true);
  });

  it("accepts genuine JSON text", async () => {
    const data = new TextEncoder().encode(JSON.stringify({ steps: ["one", "two"] }));
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.json", mimeType: "application/json", data }),
    ).resolves.toBe(true);
  });

  it("rejects an executable renamed to a .pdf", async () => {
    const data = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.pdf", mimeType: "application/pdf", data }),
    ).resolves.toBe(false);
  });

  it("rejects a PNG renamed to a .txt", async () => {
    const data = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.txt", mimeType: "text/plain", data }),
    ).resolves.toBe(false);
  });

  it("rejects a claimed image whose bytes have no recognizable signature", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.png", mimeType: "image/png", data }),
    ).resolves.toBe(false);
  });

  it("rejects text containing a NUL byte", async () => {
    const data = new Uint8Array([...new TextEncoder().encode("hi"), 0, ...new TextEncoder().encode("there")]);
    await expect(
      attachmentContentMatchesDeclaredType({ name: "a.txt", mimeType: "text/plain", data }),
    ).resolves.toBe(false);
  });
});
