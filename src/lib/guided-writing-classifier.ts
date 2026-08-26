import type { GuideProfile, TaskType } from "@prisma/client";

export interface WritingContextClassification {
  profile: GuideProfile;
  // "deterministic": an explicit keyword matched, confident enough to show a
  // register-specific opening without asking first. "needs_confirmation": no
  // rule matched (or the task type allows more than one profile with no
  // signal either way) -- the learner must confirm before any opening shows.
  confidence: "deterministic" | "needs_confirmation";
}

// Deliberately plain substring matching on normalized, lowercased text --
// no model call, no scoring, nothing that isn't directly auditable by
// reading this file. See docs/guided-writing.md.
const INFORMAL_KEYWORDS = [
  "ami",
  "amie",
  "amis",
  "copain",
  "copine",
  "proche",
  "camarade",
  "cher ami",
  "chère amie",
  "famille",
  "cousin",
  "cousine",
  "frère",
  "soeur",
  "sœur",
];

const FORMAL_KEYWORDS = [
  "madame",
  "monsieur",
  "directeur",
  "directrice",
  "direction",
  "entreprise",
  "employeur",
  "collègue",
  "service client",
  "service clientèle",
  "réclamation",
  "responsable",
  "propriétaire",
  "bailleur",
  "administration",
  "gérant",
  "gérante",
  "hôtel",
  "banque",
];

// Matched as genre phrases ("un courrier", "un article"), not bare nouns
// like "journal" or "lecteurs" -- those also show up inside article prompts
// that merely name their publication or audience (e.g. "un article pour le
// journal de votre lycée... afin de convaincre vos lecteurs"), which would
// otherwise collide with both sets and turn an unambiguous prompt into a
// false "needs confirmation".
const PUBLIC_LETTER_KEYWORDS = ["un courrier", "une lettre ouverte", "cette lettre"];

const ARTICLE_KEYWORDS = ["un article", "une note", "un blog", "sur le blog"];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
}

function matchesAny(normalizedText: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(normalize(keyword)));
}

/**
 * Classifies a topic's writing situation from its visible French prompt
 * text only -- never the learner's draft. Task 3 is always the
 * argumentative-analysis profile (every TCF Tâche 3 prompt is a two-document
 * analysis, see starter-topics.ts and recent-exam-topics.ts's parseTaskThree),
 * so it's deterministic without reading the prompt at all. A colleague is
 * treated as professional/formal; "correspondant" and "camarade" are not
 * enough to establish a register on their own, so Task 1 and Task 2 fall
 * back to "needs_confirmation" whenever no unambiguous keyword matches. The
 * UI must ask the learner instead of showing a possibly wrong register.
 */
export function classifyWritingContext(taskType: TaskType, prompt: string): WritingContextClassification {
  if (taskType === "TASK_3") {
    return { profile: "ARGUMENTATIVE_ANALYSIS", confidence: "deterministic" };
  }

  const normalizedPrompt = normalize(prompt);

  if (taskType === "TASK_1") {
    const isFormal = matchesAny(normalizedPrompt, FORMAL_KEYWORDS);
    const isInformal = matchesAny(normalizedPrompt, INFORMAL_KEYWORDS);

    if (isFormal && !isInformal) {
      return { profile: "FORMAL_PROFESSIONAL_MESSAGE", confidence: "deterministic" };
    }
    if (isInformal && !isFormal) {
      return { profile: "INFORMAL_PERSONAL_MESSAGE", confidence: "deterministic" };
    }
    return { profile: "INFORMAL_PERSONAL_MESSAGE", confidence: "needs_confirmation" };
  }

  // TASK_2
  const isPublicLetter = matchesAny(normalizedPrompt, PUBLIC_LETTER_KEYWORDS);
  const isArticle = matchesAny(normalizedPrompt, ARTICLE_KEYWORDS);

  if (isPublicLetter && !isArticle) {
    return { profile: "PUBLIC_LETTER", confidence: "deterministic" };
  }
  if (isArticle && !isPublicLetter) {
    return { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "deterministic" };
  }
  return { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "needs_confirmation" };
}
