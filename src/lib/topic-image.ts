const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const IMAGE_MODEL = "gpt-image-1";
const IMAGE_SIZE = "1024x1024";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export interface GeneratedTopicImage {
  dataUrl: string;
}

/**
 * Generates one illustrative image and returns it as a self-contained data
 * URL. gpt-image-1 only returns base64 image bytes (no hosted URL option),
 * which conveniently matches storing the result directly rather than caching
 * a provider link that could expire.
 */
export async function generateTopicImage(
  prompt: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<GeneratedTopicImage> {
  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: IMAGE_SIZE,
      n: 1,
    }),
    signal,
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = isRecord(payload) ? payload.error : undefined;
    const message = isRecord(errorBody) && typeof errorBody.message === "string" ? errorBody.message : undefined;
    throw new Error(`Image generation request failed (${response.status})${message ? `: ${message}` : ""}`);
  }

  const data = isRecord(payload) ? payload.data : undefined;
  const first = Array.isArray(data) ? data[0] : undefined;
  const base64 = isRecord(first) && typeof first.b64_json === "string" ? first.b64_json : "";

  if (!base64) {
    throw new Error("Image generation response contained no image data.");
  }

  return { dataUrl: `data:image/png;base64,${base64}` };
}
