import { fileTypeFromBuffer } from "file-type";

// Server-only: pulls in file-type's Node buffer scanning, so this must never
// be imported from support-request.ts (shared with the client form).
const BINARY_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip"]);

function extensionOf(name: string) {
  return name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
}

function isPlainText(data: Uint8Array) {
  if (data.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data);
    return true;
  } catch {
    return false;
  }
}

// The extension and browser-supplied MIME type are both attacker controlled,
// so isAcceptedSupportAttachment alone lets a renamed executable or polyglot
// file through. This sniffs the actual bytes and rejects anything whose
// content doesn't match what the filename/type claims.
export async function attachmentContentMatchesDeclaredType({
  name,
  mimeType,
  data,
}: {
  name: string;
  mimeType: string;
  data: Uint8Array;
}): Promise<boolean> {
  const extension = extensionOf(name);
  const detected = await fileTypeFromBuffer(data);

  if (BINARY_EXTENSIONS.has(extension)) {
    if (!detected) return false;
    if (extension === ".zip") return detected.mime === "application/zip";
    return detected.mime === mimeType;
  }

  // text/plain and application/json have no magic-byte signature: a genuine
  // text file should never match a known binary signature, and should
  // decode cleanly as text with no embedded NUL bytes.
  if (detected) return false;
  return isPlainText(data);
}
