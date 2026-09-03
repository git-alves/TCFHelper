// Kept outside the route so the client-side picker and the server-side
// validator share the exact same category and attachment contract.
export const SUPPORT_CATEGORIES = [
  "BUG",
  "QUESTION",
  "FEATURE_REQUEST_FEEDBACK",
  "ACCOUNT_ACCESS",
  "OTHER",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_DESCRIPTION_MAX_CHARS = 10_000;
// Vercel Functions cap request bodies at 4.5 MB. Leaving headroom for the
// multipart envelope keeps an attachment that the form accepts deployable,
// rather than advertising a size that production would reject upstream.
export const SUPPORT_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;

const ACCEPTED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
]);

const ACCEPTED_ATTACHMENT_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".txt",
  ".pdf",
  ".json",
  ".zip",
]);

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".zip": "application/zip",
};

export const SUPPORT_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/pdf",
  "application/json",
  "application/zip",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".txt",
  ".pdf",
  ".json",
  ".zip",
].join(",");

export function isSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && (SUPPORT_CATEGORIES as readonly string[]).includes(value);
}

export function isAcceptedSupportAttachment({
  name,
  type,
}: {
  name: string;
  type: string;
}) {
  const extension = name.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ACCEPTED_ATTACHMENT_TYPES.has(type.toLowerCase()) || Boolean(extension && ACCEPTED_ATTACHMENT_EXTENSIONS.has(extension));
}

// Preserve an allowed browser-provided MIME type when possible, but fall
// back to the reviewed extension mapping. This prevents a `.txt` file whose
// browser claims `text/html` from later being served with that unsafe type.
export function normalizeSupportAttachmentMimeType({
  name,
  type,
}: {
  name: string;
  type: string;
}) {
  const normalizedType = type.toLowerCase();
  if (ACCEPTED_ATTACHMENT_TYPES.has(normalizedType)) return normalizedType;

  const extension = name.toLowerCase().match(/\.[^.]+$/)?.[0];
  return extension ? MIME_TYPE_BY_EXTENSION[extension] ?? null : null;
}

export function formatSupportAttachmentLimit(locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    SUPPORT_ATTACHMENT_MAX_BYTES / 1024 / 1024,
  );
}
