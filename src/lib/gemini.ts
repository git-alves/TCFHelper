import type { TaskType } from "@prisma/client";
import { type TaskDefinition } from "@/lib/tcf-tasks";
import { CEFR_CONFIDENCE_LEVELS, CEFR_LEVELS, ERROR_CATEGORIES } from "@/lib/essay-feedback";
import { hasTaskThreeDocuments } from "@/lib/task-three-topic";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Google AI Studio's free tier (no credit card, no billing) — kept
// overridable via GEMINI_MODEL since free-tier model names are retired and
// replaced over time.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
// Deliberately separate from GEMINI_MODEL/DEFAULT_GEMINI_MODEL above:
// learner-facing correction should not silently share whatever model the
// model-answer generator happens to use. Flash-Lite is the cheaper/faster
// line suited to structured grading, while full Flash remains available for
// learner-facing model answers.
const DEFAULT_GEMINI_CORRECTION_MODEL = "gemini-3.5-flash-lite";
const REQUEST_TIMEOUT_MS = 20_000;
// Bump this when the CEFR instructions, answer shape, or primary model policy
// materially changes so learners never receive an answer cached for an older
// rubric or provider setup.
export const MODEL_ANSWER_PROMPT_VERSION = "2026-08-13";

export type ExampleCefrLevel = "B2" | "C1" | "C2";

export class GeminiNotConfiguredError extends Error {}
export class GeminiRateLimitedError extends Error {}

/** True when a server-side Gemini credential is available for a provider call. */
export function hasConfiguredGemini() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Any other Gemini failure (bad request, auth rejection, upstream outage, or
 * an unparseable response). The constructor accepts only the HTTP status —
 * never a message — and builds its own fixed text internally, so it is
 * structurally impossible for a call site to embed Google's own error text
 * (which could echo back part of the request) into this error, now or in
 * the future.
 */
export class GeminiRequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Gemini request failed (${status}).`);
    this.status = status;
  }
}

/**
 * The request never reached Gemini or never got a response at all (network
 * failure, DNS failure, or the request timeout) — there is no HTTP status to
 * report. A fixed message only, for the same reason as GeminiRequestError.
 */
export class GeminiTransportError extends Error {
  constructor() {
    super("Gemini request could not be completed.");
  }
}

/** Gemini returned a 2xx response, but its body wasn't valid JSON. */
export class GeminiCorrectionParseError extends Error {
  constructor() {
    super("Gemini's correction response was not valid JSON.");
  }
}

export interface GenerateModelAnswerParams {
  task: TaskDefinition;
  taskType: TaskType;
  level: ExampleCefrLevel;
  topicPrompt: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

// Mirrors the CEFR bands the correction prompt (essay-correction-prompt.ts)
// grades Tache 1 against, phrased as writing instructions instead of grading
// criteria, so the study example and the grading rubric never drift apart.
const TASK_ONE_LEVEL_DESCRIPTIONS: Record<ExampleCefrLevel, string> = {
  B2: "clear and reasonably detailed communication, appropriate organization, sufficient vocabulary, and generally controlled grammar -- describing or explaining the required information without excessive ambiguity.",
  C1: "consistently precise communication, strong control of register, flexible vocabulary, and sophisticated organization where appropriate, communicating detailed information naturally and efficiently.",
  C2: "exceptionally precise, natural, flexible, and nuanced communication with near-complete control of grammar, vocabulary, syntax, and register -- without resorting to unnecessarily literary or sophisticated language.",
};

// Mirrors the CEFR bands the correction prompt grades Tache 2 against.
const TASK_TWO_LEVEL_DESCRIPTIONS: Record<ExampleCefrLevel, string> = {
  B2: "a clear narrative with generally well-connected commentary, reasonably developed opinions or arguments, appropriate connectors, and register suited to the stated objective.",
  C1: "a fluent narrative with flexible, natural cohesion between the account and the commentary, precise and varied vocabulary, effective paragraph organization, and well-justified opinions or arguments.",
  C2: "a highly natural, nuanced narrative and commentary with sophisticated cohesion, subtle control of tone and register, and near-complete linguistic control.",
};

// Mirrors the CEFR bands the correction prompt (ARGUMENTATIVE QUALITY)
// grades Tache 3 against. The fixed structure below (title/summary/opinion,
// including the argument-against and nuance) stays the same at every level
// -- real Tache 3 responses at B2 still need to compare viewpoints and argue
// a position -- but how sophisticated that execution should be does vary,
// which is what this supplies instead of the generic, task-agnostic
// LEVEL_DESCRIPTIONS fallback.
const TASK_THREE_LEVEL_DESCRIPTIONS: Record<ExampleCefrLevel, string> = {
  B2: "a clear position with understandable reasons, sufficiently developed arguments, logically connected ideas, a generally clear comparison of viewpoints, and a coherent overall structure. Arguments may still be relatively straightforward.",
  C1: "well-developed and logically connected arguments, clear synthesis of the viewpoints, precise comparison, effective justification, relevant qualification and nuance, strong cohesion, precise vocabulary, and controlled complex syntax.",
  C2: "exceptionally sophisticated and controlled argumentation: precise synthesis, subtle distinctions, nuanced evaluation, natural handling of counterarguments, precise qualification, flexible and sophisticated cohesion, and very high linguistic accuracy -- functional and sustained, not just decorative vocabulary or long sentences.",
};

const TASK_ONE_EXAMPLE_STRUCTURE =
  "Write this as a short, natural message (a letter, an email, or a note) addressed directly to the recipient " +
  "described in the topic. Open with a greeting and close appropriately for the register the situation calls " +
  "for, and make sure every piece of information or event the topic asks for is covered.";

// Mirrors the corrected official Tache 2 format: an article, letter, or note
// to several/general readers (not a single private recipient), recounting an
// experience and adding commentary suited to a stated objective -- not a
// plain opinion essay with an introduction/development/conclusion.
const TASK_TWO_EXAMPLE_STRUCTURE =
  "This format is an article, an open letter, or a note addressed to several or general readers -- not a single " +
  "private recipient. Recount the experience or event the topic describes, then add commentary, opinions, or " +
  "arguments suited to the topic's stated objective (for example: to persuade, to reconcile, to promote, to " +
  "warn). Use connectors that move naturally from the narrative into the commentary.";

// validateAnswerLength (model-answer-generator.ts) counts every word in the
// returned text, title included -- so the prompt must not tell the model a
// title is exempt from the word range, or the two would disagree about what
// "120-180 words" means. The title is kept in the total by asking for it to
// be brief rather than by excluding it.
const TASK_THREE_STRUCTURE =
  "This topic presents two source documents with opposing viewpoints on a social issue. Structure the " +
  "response in exactly three parts, in this order, keeping the total length (title included) within the " +
  "required word range below, aiming for around 160-180 words overall:\n" +
  "1. Title: a short, catchy title introducing the social issue (a few words -- keep it brief, it counts " +
  "toward the total length).\n" +
  "2. Summary (40-60 words): objectively summarize and contrast the two documents' opposing viewpoints, " +
  "without giving a personal opinion. Use contrasting connectors, e.g. \"D'un côté... d'un autre côté\", " +
  "\"Le premier document souligne que... tandis que le second met en avant...\".\n" +
  "3. Opinion (the rest of the length, roughly 100-130 words): structure it in exactly this order -- " +
  "(a) one argument in favor of your position (two to three sentences), followed by a concrete example " +
  "illustrating it; " +
  "(b) a nuance acknowledging a limit or counterpoint to that argument; " +
  "(c) one argument against your position (two to three sentences) -- a genuine counter-argument -- " +
  "followed by a concrete example illustrating it; " +
  "(d) a brief conclusion restating your personal position. " +
  "Use connectors suited to each part, e.g. \"Premièrement\"/\"D'une part\" for the argument in favor, " +
  "\"Cependant\"/\"Néanmoins\" for the nuance, \"Toutefois\"/\"En revanche\" for the argument against, and " +
  "\"En conclusion\"/\"Pour conclure\" for the conclusion.\n" +
  "Separate the title, the summary, and the opinion each with a blank line.";

export function buildExamplePrompt({ task, taskType, level, topicPrompt }: GenerateModelAnswerParams): string {
  const isTaskThree = taskType === "TASK_3" && hasTaskThreeDocuments(topicPrompt);
  const structuralNote =
    taskType === "TASK_1"
      ? TASK_ONE_EXAMPLE_STRUCTURE
      : taskType === "TASK_2"
        ? TASK_TWO_EXAMPLE_STRUCTURE
        : isTaskThree
          ? TASK_THREE_STRUCTURE
          : "";
  const levelDescription =
    taskType === "TASK_1"
      ? TASK_ONE_LEVEL_DESCRIPTIONS[level]
      : taskType === "TASK_2"
        ? TASK_TWO_LEVEL_DESCRIPTIONS[level]
        : TASK_THREE_LEVEL_DESCRIPTIONS[level];
  const outputFormatNote = isTaskThree
    ? ", formatted exactly as described above"
    : taskType === "TASK_2"
      ? " — no explanation, and only a short title if the topic calls for the article format"
      : " — no title, no explanation";

  return (
    "You are a TCF (Test de Connaissance du Français) examiner writing a model answer for a learner to " +
    "study.\n" +
    `Task: ${task.label} - ${task.title}\n` +
    `Instructions: ${task.description}\n` +
    `Required length: ${task.minWords}-${task.maxWords} words.\n` +
    (structuralNote ? `${structuralNote}\n` : "") +
    `Topic:\n${topicPrompt}\n\n` +
    "Write a complete, natural, well-structured French response to this exact topic. The response must " +
    `authentically demonstrate CEFR level ${level}: ${levelDescription}\n` +
    "Stay within the required word range. Return only the French response text itself" +
    outputFormatNote +
    ", no markdown formatting."
  );
}

function extractText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const content = candidates[0];
  if (!isRecord(content) || !isRecord(content.content)) return "";

  const parts = content.content.parts;
  if (!Array.isArray(parts) || parts.length === 0) return "";

  const firstPart = parts[0];
  return isRecord(firstPart) && typeof firstPart.text === "string" ? firstPart.text : "";
}

/**
 * Generates a French model answer via Gemini. It deliberately keeps a
 * separately configurable model from correction so example quality and
 * correction quality can evolve independently.
 */
export async function generateModelAnswer(params: GenerateModelAnswerParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!hasConfiguredGemini() || !apiKey) {
    throw new GeminiNotConfiguredError("GEMINI_API_KEY is not set.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  // The key is sent only via the x-goog-api-key header, never as a ?key=
  // query parameter: a URL-embedded secret is far more likely to end up in
  // an access log or proxy trace than a header is.
  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildExamplePrompt(params) }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GeminiTransportError();
  }

  if (response.status === 429) {
    throw new GeminiRateLimitedError("Gemini free-tier rate limit reached.");
  }

  if (!response.ok) {
    throw new GeminiRequestError(response.status);
  }

  // A response object alone only proves the headers arrived; reading the
  // body can still fail (a dropped connection or the timeout firing mid
  // stream). A SyntaxError means the body was fully read but wasn't valid
  // JSON — a request-level problem, same as any other unusable response.
  // Anything else means the body was never actually read — a transport
  // failure, not a status-based one.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new GeminiRequestError(response.status);
    }
    throw new GeminiTransportError();
  }

  const text = extractText(payload).trim();
  if (!text) {
    throw new GeminiRequestError(response.status);
  }

  return text;
}

// Full grading responses (corrected text, model version, per-criterion
// feedback) run far longer than a short model answer.
const CORRECTION_REQUEST_TIMEOUT_MS = 45_000;

const CRITERION_SCORE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", minimum: 0, maximum: 100 },
    feedback: { type: "STRING" },
  },
  required: ["score", "feedback"],
};

// A hand-written OpenAPI-subset mirror of essayFeedbackSchema
// (essay-feedback.ts) -- Gemini's responseSchema only accepts that subset
// (no zod, no $ref), so this is kept in sync by hand rather than derived.
const CORRECTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    correctedText: { type: "STRING" },
    modelVersion: { type: "STRING" },
    scores: {
      type: "OBJECT",
      properties: {
        content: CRITERION_SCORE_RESPONSE_SCHEMA,
        linguistics: CRITERION_SCORE_RESPONSE_SCHEMA,
        vocabulary: CRITERION_SCORE_RESPONSE_SCHEMA,
      },
      required: ["content", "linguistics", "vocabulary"],
    },
    cefr: {
      type: "OBJECT",
      // description strings reinforce the system prompt's CEFR ASSESSMENT
      // section directly on the fields the model is filling in, since this
      // schema is a separate structured parameter the model also attends to.
      properties: {
        estimatedLevel: {
          type: "STRING",
          enum: [...CEFR_LEVELS],
          description:
            "Demonstrated level: the level the raw evidence alone suggests, including capability shown only occasionally, before the conservative tie-breaking rule.",
        },
        conservativeLevel: {
          type: "STRING",
          enum: [...CEFR_LEVELS],
          description:
            "Secure level: estimatedLevel lowered to the more conservative band whenever it was not demonstrated consistently. Must never exceed estimatedLevel. This is the level actually assigned to the student.",
        },
        confidence: { type: "STRING", enum: [...CEFR_CONFIDENCE_LEVELS] },
        rationale: { type: "STRING" },
        evidence: { type: "STRING" },
        blocker: { type: "STRING" },
      },
      required: ["estimatedLevel", "conservativeLevel", "confidence", "rationale", "evidence", "blocker"],
    },
    meetsWordCount: { type: "BOOLEAN" },
    wordCountNote: { type: "STRING" },
    errors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          originalText: { type: "STRING" },
          // nullable, not just non-required: Gemini fills every declared
          // property, required or not, so an omitted offset still arrives as
          // JSON null rather than a missing key. essayFeedbackSchema accepts
          // null here (.nullish()) to match.
          originalStart: { type: "INTEGER", minimum: 0, nullable: true },
          correctedText: { type: "STRING" },
          correctionStart: { type: "INTEGER", minimum: 0, nullable: true },
          explanation: { type: "STRING" },
          errorType: { type: "STRING", enum: [...ERROR_CATEGORIES] },
        },
        required: ["originalText", "correctedText", "explanation", "errorType"],
      },
    },
    suggestions: { type: "ARRAY", items: { type: "STRING" } },
    summary: { type: "STRING" },
  },
  required: [
    "correctedText",
    "modelVersion",
    "scores",
    "cefr",
    "meetsWordCount",
    "wordCountNote",
    "errors",
    "suggestions",
    "summary",
  ],
};

export interface GradeEssayWithGeminiParams {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Grades an essay via Gemini using response-schema-constrained JSON output.
 * The caller still validates the returned value against essayFeedbackSchema:
 * Gemini's response schema narrows the shape, but a provider response remains
 * untrusted at the application boundary.
 */
export async function gradeEssayWithGemini({
  systemPrompt,
  userPrompt,
}: GradeEssayWithGeminiParams): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!hasConfiguredGemini() || !apiKey) {
    throw new GeminiNotConfiguredError("GEMINI_API_KEY is not set.");
  }

  // No fallback to GEMINI_MODEL: correction has its own setting so grading
  // never implicitly rides on the model-answer generator's configuration.
  const model = process.env.GEMINI_CORRECTION_MODEL?.trim() || DEFAULT_GEMINI_CORRECTION_MODEL;

  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        // No `temperature`: the default correction model is a Flash-Lite
        // model, and Google documents `temperature` as deprecated for that
        // family (an error in a future release) -- omit it rather than send
        // a parameter that could start failing requests later.
        generationConfig: {
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: CORRECTION_RESPONSE_SCHEMA,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(CORRECTION_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GeminiTransportError();
  }

  if (response.status === 429) {
    throw new GeminiRateLimitedError("Gemini free-tier rate limit reached.");
  }

  if (!response.ok) {
    throw new GeminiRequestError(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new GeminiRequestError(response.status);
    }
    throw new GeminiTransportError();
  }

  const text = extractText(payload).trim();
  if (!text) {
    throw new GeminiRequestError(response.status);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiCorrectionParseError();
  }
}
