import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { TaskType } from "@prisma/client";

const SOURCE_ORIGIN = "https://reussir-tcfcanada.com";
const WORDPRESS_PAGES_PATH = "/wp-json/wp/v2/pages";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_TOPIC_CHARS = 6_000;

const FRENCH_MONTHS = [
  { slug: "janvier", title: "Janvier" },
  { slug: "fevrier", title: "Février" },
  { slug: "mars", title: "Mars" },
  { slug: "avril", title: "Avril" },
  { slug: "mai", title: "Mai" },
  { slug: "juin", title: "Juin" },
  { slug: "juillet", title: "Juillet" },
  { slug: "aout", title: "Août" },
  { slug: "septembre", title: "Septembre" },
  { slug: "octobre", title: "Octobre" },
  { slug: "novembre", title: "Novembre" },
  { slug: "decembre", title: "Décembre" },
] as const;

const TASK_HEADINGS: Record<TaskType, string> = {
  TASK_1: "Tâche 1",
  TASK_2: "Tâche 2",
  TASK_3: "Tâche 3",
};

export type RecentExamTopicErrorCode =
  | "INVALID_TASK"
  | "UNAVAILABLE"
  | "INVALID_SOURCE"
  | "NOT_PUBLISHED";

export class RecentExamTopicError extends Error {
  readonly code: RecentExamTopicErrorCode;
  readonly sourceMonth?: string;

  constructor(code: RecentExamTopicErrorCode, message: string, sourceMonth?: string) {
    super(message);
    this.name = "RecentExamTopicError";
    this.code = code;
    this.sourceMonth = sourceMonth;
  }
}

export interface RecentExamTopic {
  taskType: TaskType;
  combination: number;
  title: string;
  prompt: string;
  sourceUrl: string;
  sourceMonth: string;
  externalRef: string;
}

/**
 * Test-only seams are deliberately limited to the clock, transport, response
 * limits, and selection. The source URL itself is never caller controlled.
 */
export interface RecentExamTopicOptions {
  now?: Date;
  fetch?: typeof fetch;
  random?: () => number;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

interface RecentExamSource {
  apiUrl: URL;
  pageUrl: string;
  slug: string;
  expectedMonthTitle: string;
  sourceMonth: string;
}

interface WordPressPage {
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
}

interface ParsedTopic {
  combination: number;
  title: string;
  prompt: string;
}

/**
 * Builds the fixed WordPress REST endpoint and public page URL for a given
 * UTC date. UTC is intentional: it gives the service one unambiguous month
 * boundary regardless of the host's locale or timezone.
 */
export function getRecentExamSource(now: Date = new Date()): {
  apiUrl: string;
  pageUrl: string;
  sourceMonth: string;
} {
  const source = buildRecentExamSource(now, 0);
  return {
    apiUrl: source.apiUrl.toString(),
    pageUrl: source.pageUrl,
    sourceMonth: source.sourceMonth,
  };
}

// The upstream site can lag a few days into a new month before publishing its
// page. Retry exactly once against the prior month, but only after a genuine
// "not published" response rather than a transport or parsing failure.
const MONTHS_AGO_TO_TRY = [0, 1] as const;

/**
 * Fetches one topic for the selected task, preferring the current month and
 * falling back to last month if the current month has not been published
 * yet. All upstream HTML is converted to validated plain text before it
 * leaves this server-only module.
 */
export async function getRecentExamTopic(
  taskType: TaskType,
  options: RecentExamTopicOptions = {}
): Promise<RecentExamTopic> {
  const heading = TASK_HEADINGS[taskType];
  if (!heading) {
    throw new RecentExamTopicError("INVALID_TASK", "Unsupported TCF task type.");
  }

  const now = options.now ?? new Date();
  let notPublishedError: RecentExamTopicError | undefined;

  for (const monthsAgo of MONTHS_AGO_TO_TRY) {
    const source = buildRecentExamSource(now, monthsAgo);

    try {
      const responseText = await fetchCurrentMonthPage(source, options);
      let candidates: ParsedTopic[];
      try {
        const page = parseWordPressResponse(responseText, source);
        candidates = parseElementorTopics(page.content.rendered, source.expectedMonthTitle, taskType);
      } catch (error) {
        if (error instanceof RecentExamTopicError) {
          throw error;
        }
        throw new RecentExamTopicError("INVALID_SOURCE", "The recent-exam source could not be parsed.");
      }

      if (candidates.length === 0) {
        throw new RecentExamTopicError("INVALID_SOURCE", "No matching task was found in this month.");
      }

      const selected = candidates[pickIndex(candidates.length, options.random ?? Math.random)];
      const externalRef = createExternalRef(source.sourceMonth, taskType, selected);

      return {
        taskType,
        combination: selected.combination,
        title: selected.title,
        prompt: selected.prompt,
        sourceUrl: source.pageUrl,
        sourceMonth: source.sourceMonth,
        externalRef,
      };
    } catch (error) {
      // Only a genuinely unpublished month falls back; a real failure (bad
      // response, changed markup, network outage) fails closed instead of
      // masking itself behind an older, unrelated topic.
      if (error instanceof RecentExamTopicError && error.code === "NOT_PUBLISHED") {
        notPublishedError ??= error;
        continue;
      }

      throw error;
    }
  }

  throw (
    notPublishedError ??
    new RecentExamTopicError("UNAVAILABLE", "The recent-exam topic is unavailable.")
  );
}

function buildRecentExamSource(now: Date, monthsAgo: number): RecentExamSource {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new RecentExamTopicError("INVALID_SOURCE", "A valid current date is required.");
  }

  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const year = target.getUTCFullYear();
  const month = FRENCH_MONTHS[target.getUTCMonth()];
  const monthNumber = String(target.getUTCMonth() + 1).padStart(2, "0");
  const slug = `${month.slug}-${year}-expression-ecrite`;
  const pageUrl = new URL(`/${slug}/`, SOURCE_ORIGIN).toString();
  const apiUrl = new URL(WORDPRESS_PAGES_PATH, SOURCE_ORIGIN);

  apiUrl.search = new URLSearchParams({
    slug,
    _fields: "id,slug,link,date,modified,title,content",
  }).toString();

  if (apiUrl.origin !== SOURCE_ORIGIN) {
    // This invariant should be impossible to violate, but keeps future URL
    // edits from turning this into a caller-controlled outbound request.
    throw new RecentExamTopicError("INVALID_SOURCE", "Recent-exam source origin is invalid.");
  }

  return {
    apiUrl,
    pageUrl,
    slug,
    expectedMonthTitle: `${month.title} ${year}`,
    sourceMonth: `${year}-${monthNumber}`,
  };
}

async function fetchCurrentMonthPage(
  source: RecentExamSource,
  options: RecentExamTopicOptions
): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = clamp(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1, MAX_TIMEOUT_MS);
  const maxBytes = clamp(
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    1,
    MAX_RESPONSE_BYTES
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await (options.fetch ?? fetch)(source.apiUrl, {
        signal: controller.signal,
        redirect: "error",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new RecentExamTopicError(
        "UNAVAILABLE",
        controller.signal.aborted
          ? "The recent-exam source timed out."
          : "The recent-exam source could not be reached."
      );
    }

    validateResponse(response, source);
    return await readBoundedResponse(response, maxBytes, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function validateResponse(response: Response, source: RecentExamSource): void {
  if (!response.ok) {
    throw new RecentExamTopicError("UNAVAILABLE", "The recent-exam source is unavailable.");
  }

  if (response.redirected) {
    throw new RecentExamTopicError("INVALID_SOURCE", "The recent-exam source redirected unexpectedly.");
  }

  // Native fetch leaves `url` empty on synthetic test Responses. When the
  // transport provides it, it must still point at the fixed WordPress API.
  if (response.url) {
    let finalUrl: URL;
    try {
      finalUrl = new URL(response.url);
    } catch {
      throw new RecentExamTopicError("INVALID_SOURCE", "The source response URL is invalid.");
    }

    if (
      finalUrl.origin !== SOURCE_ORIGIN ||
      finalUrl.pathname !== source.apiUrl.pathname
    ) {
      throw new RecentExamTopicError("INVALID_SOURCE", "The source response left its allowed origin.");
    }
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.toLowerCase().includes("application/json")) {
    throw new RecentExamTopicError("INVALID_SOURCE", "The source did not return JSON.");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new RecentExamTopicError("UNAVAILABLE", "The source response is too large.");
  }
}

async function readBoundedResponse(
  response: Response,
  maxBytes: number,
  signal: AbortSignal
): Promise<string> {
  if (!response.body) {
    throw new RecentExamTopicError("INVALID_SOURCE", "The source response had no body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RecentExamTopicError("UNAVAILABLE", "The source response is too large.");
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  } catch (error) {
    if (error instanceof RecentExamTopicError) {
      throw error;
    }

    throw new RecentExamTopicError(
      "UNAVAILABLE",
      signal.aborted
        ? "The recent-exam source timed out."
        : "The recent-exam source response could not be read."
    );
  }
}

function parseWordPressResponse(text: string, source: RecentExamSource): WordPressPage {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new RecentExamTopicError("INVALID_SOURCE", "The source returned malformed JSON.");
  }

  if (!Array.isArray(payload)) {
    throw new RecentExamTopicError("INVALID_SOURCE", "The source returned an invalid page list.");
  }

  if (payload.length === 0) {
    throw new RecentExamTopicError(
      "NOT_PUBLISHED",
      `${source.expectedMonthTitle} has not been published yet.`,
      source.sourceMonth,
    );
  }

  if (payload.length !== 1 || !isWordPressPage(payload[0])) {
    throw new RecentExamTopicError("UNAVAILABLE", "This month's recent-exam page is unavailable.");
  }

  const page = payload[0];
  if (page.slug !== source.slug || !hasExpectedPageTitle(page.title.rendered, source.expectedMonthTitle)) {
    throw new RecentExamTopicError("INVALID_SOURCE", "The source did not return the current month.");
  }

  return page;
}

function isWordPressPage(value: unknown): value is WordPressPage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const page = value as Partial<WordPressPage>;
  return (
    typeof page.slug === "string" &&
    typeof page.title?.rendered === "string" &&
    typeof page.content?.rendered === "string" &&
    page.content.rendered.length > 0
  );
}

function hasExpectedPageTitle(renderedTitle: string, expectedMonthTitle: string): boolean {
  const title = normalizeText(cheerio.load(renderedTitle, undefined, false).text());
  return title === `${expectedMonthTitle} Expression écrite` || title === expectedMonthTitle;
}

function parseElementorTopics(
  html: string,
  expectedMonthTitle: string,
  taskType: TaskType
): ParsedTopic[] {
  const $ = cheerio.load(html, undefined, false);
  const pageHeading = normalizeText($("h1").first().text());
  if (pageHeading !== expectedMonthTitle) {
    throw new RecentExamTopicError("INVALID_SOURCE", "The source content was not for the current month.");
  }

  const combinationRoots = getCombinationRoots($);
  if (combinationRoots.length === 0) {
    throw new RecentExamTopicError("INVALID_SOURCE", "No recent-exam combinations were found.");
  }

  const seenCombinations = new Set<number>();
  const taskHeading = TASK_HEADINGS[taskType];
  const topics = combinationRoots.map(({ combination, root }) => {
    if (seenCombinations.has(combination)) {
      throw new RecentExamTopicError("INVALID_SOURCE", "Duplicate recent-exam combinations were found.");
    }
    seenCombinations.add(combination);

    const taskContent = getTaskContentRoot($, root, taskHeading);
    const parsed =
      taskType === "TASK_3"
        ? parseTaskThree($, taskContent)
        : {
            title: `${taskHeading} — Combinaison ${combination}`,
            // The app already presents the official task word range. Strip
            // Elementor's repeated trailing boilerplate so the imported topic
            // itself stays focused on the writing scenario.
            prompt: stripWordCountBoilerplate(normalizeTopicText($(taskContent).text())),
          };

    validateParsedTopic(parsed);
    return { combination, ...parsed };
  });

  return topics;
}

function getCombinationRoots($: CheerioAPI): Array<{ combination: number; root: Element }> {
  const roots: Array<{ combination: number; root: Element }> = [];
  const seenRoots = new Set<Element>();

  $(".elementor-divider__text").each((_, marker) => {
    const match = normalizeText($(marker).text()).match(/^Combinaison\s+(\d+)$/iu);
    if (!match) {
      return;
    }

    const root = $(marker).closest("section.elementor-top-section").get(0);
    if (!isElement(root) || seenRoots.has(root)) {
      return;
    }

    seenRoots.add(root);
    roots.push({ combination: Number(match[1]), root });
  });

  return roots;
}

function getTaskContentRoot($: CheerioAPI, combinationRoot: Element, taskHeading: string): Element {
  const heading = $(combinationRoot)
    .find(".elementor-heading-title, h1, h2, h3, h4, h5, h6")
    .toArray()
    .find((element) => normalizeText($(element).text()) === taskHeading);

  if (!heading) {
    throw new RecentExamTopicError("INVALID_SOURCE", `${taskHeading} was missing from a combination.`);
  }

  const headingWidget = $(heading).closest(".elementor-widget-heading");
  const contentRoot = (headingWidget.length ? headingWidget : $(heading))
    .nextAll("section.elementor-inner-section")
    .first()
    .get(0);

  if (!contentRoot || $(contentRoot).closest("section.elementor-top-section").get(0) !== combinationRoot) {
    throw new RecentExamTopicError(
      "INVALID_SOURCE",
      `${taskHeading} did not have a self-contained prompt block.`
    );
  }

  return contentRoot;
}

function parseTaskThree($: CheerioAPI, taskContent: Element): Omit<ParsedTopic, "combination"> {
  const headings = $(taskContent)
    .find(".elementor-heading-title, h1, h2, h3, h4, h5, h6")
    .toArray();
  const documentOne = headings.find((element) => isDocumentHeading($(element).text(), 1));
  const documentTwo = headings.find((element) => isDocumentHeading($(element).text(), 2));

  if (!documentOne || !documentTwo) {
    throw new RecentExamTopicError("INVALID_SOURCE", "Tâche 3 must include Documents 1 and 2.");
  }

  const firstDocumentIndex = headings.indexOf(documentOne);
  const titleElement = headings
    .slice(0, firstDocumentIndex)
    .find((element) => normalizeTopicText($(element).text()).length > 0);
  const title = titleElement ? normalizeTopicText($(titleElement).text()) : "";
  const documentOneText = getDocumentText($, taskContent, documentOne, documentTwo);
  const documentTwoText = getDocumentText($, taskContent, documentTwo);

  return {
    title,
    prompt: `${title}\n\nDocument 1 :\n${documentOneText}\n\nDocument 2 :\n${documentTwoText}`,
  };
}

function isDocumentHeading(text: string, documentNumber: number): boolean {
  return new RegExp(`^Document\\s+${documentNumber}\\s*:?$`, "iu").test(normalizeText(text));
}

function getDocumentText(
  $: CheerioAPI,
  taskContent: Element,
  documentHeading: Element,
  nextDocumentHeading?: Element
): string {
  const orderedElements = $(taskContent).find("*").toArray();
  const startIndex = orderedElements.indexOf(documentHeading);
  const endIndex = nextDocumentHeading
    ? orderedElements.indexOf(nextDocumentHeading)
    : orderedElements.length;

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const element = orderedElements[index];
    if (!isTextEditorWidget(element)) {
      continue;
    }

    const text = normalizeTopicText($(element).text());
    if (text) {
      return text;
    }
  }

  throw new RecentExamTopicError("INVALID_SOURCE", "A Tâche 3 document had no text.");
}

function isTextEditorWidget(element: Element): boolean {
  const className = element.attribs.class ?? "";
  return (
    className.split(/\s+/u).includes("elementor-widget-text-editor") ||
    element.attribs["data-widget_type"] === "text-editor.default"
  );
}

function isElement(value: unknown): value is Element {
  return (
    !!value &&
    typeof value === "object" &&
    "name" in value &&
    "attribs" in value
  );
}

function validateParsedTopic(topic: Omit<ParsedTopic, "combination">): void {
  if (!topic.title || !topic.prompt) {
    throw new RecentExamTopicError("INVALID_SOURCE", "A recent-exam topic was empty.");
  }

  if (topic.prompt.length > MAX_TOPIC_CHARS) {
    throw new RecentExamTopicError("INVALID_SOURCE", "A recent-exam topic was too large.");
  }
}

function createExternalRef(sourceMonth: string, taskType: TaskType, topic: ParsedTopic): string {
  const contentHash = createHash("sha256")
    .update(
      `${sourceMonth}\u0000${taskType}\u0000${topic.combination}\u0000${topic.title}\u0000${topic.prompt}`,
      "utf8"
    )
    .digest("hex")
    .slice(0, 24);
  return `reussir-tcf-canada:${sourceMonth}:${taskType}:${topic.combination}:${contentHash}`;
}

function normalizeText(text: string): string {
  return text.replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function normalizeTopicText(text: string): string {
  return normalizeText(text).replace(/[\u0000-\u001F\u007F]/gu, "");
}

function stripWordCountBoilerplate(text: string): string {
  return text
    .replace(
      /\s*\(\s*\d+\s+mots?\s+minimum\s*\/\s*\d+\s+mots?\s+maximum\s*\)\s*$/iu,
      ""
    )
    .trim();
}

function pickIndex(length: number, random: () => number): number {
  const value = random();
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(length - 1, Math.max(0, Math.floor(value * length)));
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
