// Server-side format rules for the API key and model an admin types on
// /admin/api-keys, shared by the save route and the Test route. Every message
// is written for the admin and never contains the value that was rejected.

export const API_KEY_MIN_LENGTH = 20;
export const API_KEY_MAX_LENGTH = 500;
export const MODEL_MAX_LENGTH = 200;

// The character the panel uses to mask a stored key ("••••1234"). A value that
// contains it is a masked placeholder echoed back, not a key.
const MASK_CHARACTER = "•";

// Letters, digits, dot, underscore and hyphen only. Real keys fit: an OpenRouter
// key is "sk-or-v1-" followed by hex, and a Gemini key starts "AIza" and is
// base64url-like. Anything else (a space, "?", "%", "/", "+", "=", quotes, any
// accented or other non-ASCII character) is not part of a key, and keeping the
// set this small means a key never changes when it is URL-encoded or JSON-escaped,
// which is what lets the Test button redact it reliably from a provider's reply.
const KEY_CHARACTERS_ONLY = /^[A-Za-z0-9._-]+$/;

/**
 * A key must be at least 20 characters, using only letters, digits, dots,
 * underscores and hyphens. Real provider keys are long (a Gemini key is 39
 * characters, an OpenRouter key about 70), so a shorter value is a typo or
 * placeholder. A masked placeholder, whitespace or any other character can never
 * be a key and, sent as an HTTP header, would fail in the browser stack with a
 * confusing network error instead of a clear "invalid key" from the provider.
 * Returns a message for the admin, or null when the value is acceptable.
 */
export function validateApiKey(value: string): string | null {
  if (value.includes(MASK_CHARACTER)) {
    return "That looks like the masked key shown on this page (••••). Paste the full key, or leave the field blank to keep the saved one.";
  }
  if (/\s/.test(value)) {
    return "The API key must not contain spaces or line breaks. Paste just the key.";
  }
  if (!KEY_CHARACTERS_ONLY.test(value)) {
    return "The API key may only contain letters, digits, dots, underscores and hyphens (no accents or other special characters such as ? % / + =).";
  }
  if (value.length < API_KEY_MIN_LENGTH) {
    return `The API key looks too short: provider keys are at least ${API_KEY_MIN_LENGTH} characters.`;
  }
  if (value.length > API_KEY_MAX_LENGTH) {
    return `The API key is too long (at most ${API_KEY_MAX_LENGTH} characters).`;
  }
  return null;
}

// Each segment starts with a letter or digit and then allows letters, digits,
// dot, underscore and hyphen: the characters real model ids use, and none that
// can change a URL (no slash beyond the one vendor separator, no "?", "#", "%",
// "&", "=", space or "..").
const SEGMENT = "[A-Za-z0-9][A-Za-z0-9._-]*";
const OPENROUTER_MODEL = new RegExp(`^${SEGMENT}/${SEGMENT}(?::${SEGMENT})?$`);
const GEMINI_MODEL = new RegExp(`^${SEGMENT}$`);

export type ModelProvider = "gemini" | "openrouter";

/**
 * OpenRouter models are "vendor/model" with an optional ":variant" (for example
 * "qwen/qwen3-30b-a3b" or "meta-llama/llama-3.3-70b-instruct:free"); Gemini
 * models are one segment with no slash (for example "gemini-3.5-flash-lite").
 * Beyond matching the provider's shape, the value can never alter the request
 * URL: Gemini puts the model in the URL path.
 */
export function validateModel(provider: ModelProvider, value: string): string | null {
  if (value.length > MODEL_MAX_LENGTH) return `The model name is too long (at most ${MODEL_MAX_LENGTH} characters).`;
  // ".." is allowed by the character set (a dot is a valid model character) but
  // would read as path traversal, so it is refused with the format message.
  const noTraversal = !value.includes("..");
  if (provider === "openrouter") {
    if (noTraversal && OPENROUTER_MODEL.test(value)) return null;
    return "For OpenRouter, use the model id as vendor/model, optionally followed by :variant (for example qwen/qwen3-30b-a3b or meta-llama/llama-3.3-70b-instruct:free), with letters, digits, dots, underscores and hyphens only.";
  }
  if (noTraversal && GEMINI_MODEL.test(value)) return null;
  return "For Gemini, use a single model name with no slash, such as gemini-3.5-flash-lite (letters, digits, dots, underscores and hyphens only).";
}
