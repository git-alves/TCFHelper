"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskType } from "@prisma/client";
import type { EssayFeedback } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS, TASK_ORDER } from "@/lib/tcf-tasks";
import {
  APP_LOCALE_LABELS,
  TRANSLATABLE_MAX_CHARS,
  type AppLocale,
} from "@/lib/app-locale";
import { useAppLocale } from "@/components/app-locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface RecentExamTopic {
  id: string;
  taskType: TaskType;
  title: string;
  prompt: string;
  sourceUrl: string;
  sourceMonth: string;
}

type TopicMode = "recent" | "custom" | null;

function readRecentExamTopic(value: unknown, expectedTaskType: TaskType): RecentExamTopic | null {
  if (!value || typeof value !== "object") return null;

  const topic = (value as { topic?: unknown }).topic;
  if (!topic || typeof topic !== "object") return null;

  const candidate = topic as Record<string, unknown>;
  const { id, taskType, title, prompt, sourceUrl, sourceMonth } = candidate;
  if (
    typeof id !== "string" ||
    taskType !== expectedTaskType ||
    typeof title !== "string" ||
    typeof prompt !== "string" ||
    typeof sourceUrl !== "string" ||
    typeof sourceMonth !== "string"
  ) {
    return null;
  }

  return { id, taskType: expectedTaskType, title, prompt, sourceUrl, sourceMonth };
}

function responseErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string" &&
    value.error.trim()
  ) {
    return value.error;
  }

  return fallback;
}

function formatSourceMonth(sourceMonth: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(sourceMonth);
  if (!match) return sourceMonth;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

export function WritingWorkspace() {
  const { locale } = useAppLocale();

  const [taskType, setTaskType] = useState<TaskType | null>(null);
  const [topicMode, setTopicMode] = useState<TopicMode>(null);

  const [recentTopic, setRecentTopic] = useState<RecentExamTopic | null>(null);
  const [isRecentTopicLoading, setIsRecentTopicLoading] = useState(false);
  const [recentTopicError, setRecentTopicError] = useState<string | null>(null);

  const [customTopic, setCustomTopic] = useState("");
  const [content, setContent] = useState("");

  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);
  const [feedbackLocale, setFeedbackLocale] = useState<AppLocale | null>(null);
  const [feedbackIsStale, setFeedbackIsStale] = useState(false);
  const feedbackRef = useRef<HTMLElement>(null);
  const customTopicRef = useRef<HTMLTextAreaElement>(null);
  const recentTopicRequestId = useRef(0);

  const [pendingSwitch, setPendingSwitch] = useState<{ description: string; run: () => void } | null>(
    null
  );

  const [translation, setTranslation] = useState("");
  const [translationFor, setTranslationFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const [translationRequestFor, setTranslationRequestFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationErrorFor, setTranslationErrorFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const translationRequestId = useRef(0);
  const lastTranslatedRef = useRef<{ text: string; locale: typeof locale } | null>(null);

  const task = taskType ? TASK_INSTRUCTIONS[taskType] : null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const activeTopicPrompt =
    topicMode === "recent"
      ? recentTopic?.prompt ?? ""
      : topicMode === "custom"
        ? customTopic.trim()
        : "";

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  useEffect(() => {
    if (topicMode === "custom") customTopicRef.current?.focus();
  }, [topicMode]);

  // Debounced live translation of the draft into the app's display
  // language. Fires 800ms after the learner stops typing, skips re-sending
  // the same text/locale pair, and drops stale responses via requestId.
  useEffect(() => {
    const trimmed = content.trim();

    if (!trimmed) {
      // Content only becomes empty via the textarea's onChange handler or
      // resetDraftAndFeedback() — both already clear translation state
      // synchronously there. This just guards against a stale in-flight
      // request resolving after the fact.
      translationRequestId.current += 1;
      return;
    }

    // A French-language interface shows the learner's French draft directly.
    // This avoids an unnecessary model call that could otherwise paraphrase
    // their words rather than faithfully show the same-language text.
    if (locale === "fr") {
      translationRequestId.current += 1;
      lastTranslatedRef.current = { text: trimmed, locale };
      return;
    }

    // Beyond this, /api/translate rejects the request outright (same shared
    // limit). Skip the doomed call — the too-long notice below is derived
    // straight from `content`, so there is nothing to schedule here.
    if (trimmed.length > TRANSLATABLE_MAX_CHARS) {
      translationRequestId.current += 1;
      return;
    }

    if (
      lastTranslatedRef.current?.text === trimmed &&
      lastTranslatedRef.current?.locale === locale
    ) {
      return;
    }

    const requestId = ++translationRequestId.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setTranslationRequestFor({ text: trimmed, locale });
      setTranslationError(null);
      setTranslationErrorFor(null);

      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, targetLocale: locale }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (requestId !== translationRequestId.current) return;

          if (!res.ok) {
            const data: unknown = await res.json().catch(() => null);
            throw new Error(
              responseErrorMessage(data, "Translation is unavailable right now."),
            );
          }

          const data: unknown = await res.json();
          if (requestId !== translationRequestId.current) return;

          const nextTranslation =
            data && typeof data === "object" && typeof (data as { translation?: unknown }).translation === "string"
              ? (data as { translation: string }).translation
              : "";

          setTranslation(nextTranslation);
          setTranslationFor({ text: trimmed, locale });
          lastTranslatedRef.current = { text: trimmed, locale };
        })
        .catch((error: unknown) => {
          if (
            requestId === translationRequestId.current &&
            !(error instanceof Error && error.name === "AbortError")
          ) {
            setTranslationError(error instanceof Error ? error.message : "Translation is unavailable right now.");
            setTranslationErrorFor({ text: trimmed, locale });
          }
        })
        .finally(() => {
          if (requestId === translationRequestId.current) setTranslationRequestFor(null);
        });
    }, 800);

    return () => {
      clearTimeout(timer);
      controller.abort();
      if (translationRequestId.current === requestId) {
        translationRequestId.current += 1;
      }
    };
  }, [content, locale]);

  function resetDraftAndFeedback() {
    setContent("");
    setFeedback(null);
    setFeedbackLocale(null);
    setFeedbackIsStale(false);
    setCorrectError(null);
    translationRequestId.current += 1;
    setTranslation("");
    setTranslationFor(null);
    setTranslationError(null);
    setTranslationErrorFor(null);
    setTranslationRequestFor(null);
    lastTranslatedRef.current = null;
  }

  function cancelPendingRecentTopicRequest() {
    // Do not rely on a loading-state render to have committed yet: a learner
    // can start typing immediately after requesting a topic.
    recentTopicRequestId.current += 1;
    setIsRecentTopicLoading(false);
  }

  function hasUnsavedWork() {
    return Boolean(
      content.trim() ||
        feedback ||
        (topicMode === "recent" && recentTopic) ||
        (topicMode === "custom" && customTopic.trim())
    );
  }

  // Runs `run` immediately when there's nothing to lose; otherwise defers it
  // behind the confirmation modal so a destructive switch is never silent.
  function runOrConfirm(description: string, run: () => void) {
    if (!hasUnsavedWork()) {
      run();
      return;
    }

    setPendingSwitch({ description, run });
  }

  function resetForTask(next: TaskType) {
    if (next === taskType) return;

    runOrConfirm(
      "Switching tasks will discard your current topic, draft, and feedback.",
      () => {
        recentTopicRequestId.current += 1;
        setTaskType(next);
        setTopicMode(null);
        setRecentTopic(null);
        setIsRecentTopicLoading(false);
        setRecentTopicError(null);
        setCustomTopic("");
        resetDraftAndFeedback();
      },
    );
  }

  function chooseCustomTopic() {
    if (topicMode === "custom") {
      cancelPendingRecentTopicRequest();
      setRecentTopicError(null);
      customTopicRef.current?.focus();
      return;
    }

    runOrConfirm(
      "Switching topics will discard your current topic, draft, and feedback.",
      () => {
        recentTopicRequestId.current += 1;
        setIsRecentTopicLoading(false);
        setRecentTopicError(null);
        setRecentTopic(null);
        setCustomTopic("");
        setTopicMode("custom");
        resetDraftAndFeedback();
      },
    );
  }

  function getRecentTopic(currentTaskType: TaskType) {
    runOrConfirm(
      "Switching topics will discard your current topic, draft, and feedback.",
      () => {
        void fetchRecentTopic(currentTaskType);
      },
    );
  }

  async function fetchRecentTopic(currentTaskType: TaskType) {
    const requestId = ++recentTopicRequestId.current;
    setIsRecentTopicLoading(true);
    setRecentTopicError(null);

    try {
      const res = await fetch(
        `/api/topics/recent?taskType=${encodeURIComponent(currentTaskType)}`,
      );

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        throw new Error(
          responseErrorMessage(
            data,
            "We couldn't get a topic from recent exams. Please try again or write your own.",
          ),
        );
      }

      const data: unknown = await res.json();
      if (requestId !== recentTopicRequestId.current) return;

      const nextTopic = readRecentExamTopic(data, currentTaskType);
      if (!nextTopic) {
        throw new Error("The recent-exam topic was unavailable. Please try again or write your own.");
      }

      setRecentTopic(nextTopic);
      setCustomTopic("");
      setTopicMode("recent");
      resetDraftAndFeedback();
    } catch (error) {
      if (requestId === recentTopicRequestId.current) {
        setRecentTopicError(
          error instanceof Error
            ? error.message
            : "We couldn't get a topic from recent exams. Please try again or write your own.",
        );
      }
    } finally {
      if (requestId === recentTopicRequestId.current) setIsRecentTopicLoading(false);
    }
  }

  async function handleCorrect() {
    if (!taskType || !activeTopicPrompt || wordCount === 0 || isRecentTopicLoading) return;

    const correctionLocale = locale;

    const topicContext =
      topicMode === "recent" && recentTopic
        ? { topicId: recentTopic.id }
        : { topicPrompt: activeTopicPrompt };

    setIsCorrecting(true);
    setCorrectError(null);
    setFeedback(null);
    setFeedbackLocale(null);
    setFeedbackIsStale(false);
    try {
      const res = await fetch("/api/essays/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          ...topicContext,
          content,
          locale: correctionLocale,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong.");
      }

      const data: { feedback: EssayFeedback } = await res.json();
      setFeedback(data.feedback);
      setFeedbackLocale(correctionLocale);
    } catch (error) {
      setCorrectError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsCorrecting(false);
    }
  }

  const wordCountInRange = task ? wordCount >= task.minWords && wordCount <= task.maxWords : true;
  const trimmedContent = content.trim();
  const isDraftTooLongToTranslate =
    locale !== "fr" && trimmedContent.length > TRANSLATABLE_MAX_CHARS;
  const translationIsCurrent =
    translationFor?.text === trimmedContent && translationFor.locale === locale;
  const isTranslating =
    translationRequestFor?.text === trimmedContent &&
    translationRequestFor.locale === locale;
  const visibleTranslationError =
    translationErrorFor?.text === trimmedContent &&
    translationErrorFor.locale === locale
      ? translationError
      : null;
  // Hide an older response immediately when the learner edits the draft or
  // changes the target language; the matching response will render once it
  // arrives. A French interface simply shows the original French draft.
  const visibleTranslation = locale === "fr" ? content : translationIsCurrent ? translation : "";

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">1. Choose a task</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TASK_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => resetForTask(type)}
              aria-pressed={taskType === type}
              disabled={isCorrecting}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                taskType === type
                  ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                  : "border-black/[.1] hover:bg-black/[.03] dark:border-white/[.15] dark:hover:bg-white/[.05]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="font-medium">{TASK_INSTRUCTIONS[type].label}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {TASK_INSTRUCTIONS[type].title}
              </div>
            </button>
          ))}
        </div>
        {task && (
          <div className="rounded-xl border border-black/[.08] bg-black/[.02] p-4 text-sm dark:border-white/[.1] dark:bg-white/[.03]">
            <p>{task.description}</p>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Target length: {task.minWords}–{task.maxWords} words.
            </p>
          </div>
        )}
      </section>

      {task && (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="topic-heading">
            <h2 id="topic-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              2. Choose a topic
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => getRecentTopic(taskType!)}
                aria-pressed={topicMode === "recent"}
                aria-busy={isRecentTopicLoading}
                disabled={isCorrecting || isRecentTopicLoading}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  topicMode === "recent"
                    ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                    : "border-black/[.15] hover:bg-black/[.03] dark:border-white/[.2] dark:hover:bg-white/[.05]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="block font-medium">Get a topic from recent exams</span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  Load a topic for the task you selected.
                </span>
              </button>
              <button
                type="button"
                onClick={chooseCustomTopic}
                aria-pressed={topicMode === "custom"}
                disabled={isCorrecting}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  topicMode === "custom"
                    ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                    : "border-black/[.15] hover:bg-black/[.03] dark:border-white/[.2] dark:hover:bg-white/[.05]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="block font-medium">Write or paste my own topic</span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  Use a prompt you already have.
                </span>
              </button>
            </div>

            {isRecentTopicLoading && (
              <p role="status" aria-live="polite" className="text-sm text-zinc-500 dark:text-zinc-400">
                Getting a topic from recent exams…
              </p>
            )}

            {recentTopicError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {recentTopicError}
              </p>
            )}

            {topicMode === "recent" && recentTopic && (
              <article
                aria-label="Selected recent-exam topic"
                className="rounded-xl border border-black/[.08] bg-black/[.02] p-4 dark:border-white/[.1] dark:bg-white/[.03]"
              >
                <h3 className="font-medium">{recentTopic.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{recentTopic.prompt}</p>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Source: {" "}
                  <a
                    href={recentTopic.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Recent exams — {formatSourceMonth(recentTopic.sourceMonth)}
                  </a>
                </p>
              </article>
            )}

            {topicMode === "custom" && (
              <div>
                <label htmlFor="custom-topic" className="sr-only">
                  Your topic or prompt
                </label>
                <textarea
                  ref={customTopicRef}
                  id="custom-topic"
                  value={customTopic}
                  onChange={(e) => {
                    cancelPendingRecentTopicRequest();
                    setCustomTopic(e.target.value);
                    setCorrectError(null);
                    if (feedback) setFeedbackIsStale(true);
                  }}
                  placeholder="Paste or write the topic/prompt you want to respond to…"
                  rows={3}
                  maxLength={2000}
                  disabled={isCorrecting || isRecentTopicLoading}
                  className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
                />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">3. Write</h2>
              <span
                id="word-count"
                className={`shrink-0 text-sm ${
                  wordCountInRange
                    ? "text-zinc-500 dark:text-zinc-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {wordCount} / {task.minWords}–{task.maxWords} words
              </span>
            </div>
            <label htmlFor="essay-content" className="sr-only">
              Your response
            </label>
            <textarea
              id="essay-content"
              value={content}
              onChange={(e) => {
                cancelPendingRecentTopicRequest();
                const value = e.target.value;
                setContent(value);
                setCorrectError(null);
                setTranslationError(null);
                setTranslationErrorFor(null);
                if (feedback) setFeedbackIsStale(true);
                if (!value.trim()) {
                  translationRequestId.current += 1;
                  setTranslation("");
                  setTranslationFor(null);
                  setTranslationError(null);
                  setTranslationErrorFor(null);
                  setTranslationRequestFor(null);
                  lastTranslatedRef.current = null;
                }
              }}
              placeholder="Écrivez votre texte ici…"
              rows={14}
              maxLength={20000}
              disabled={isCorrecting || isRecentTopicLoading}
              aria-describedby="word-count"
              className="min-h-72 w-full rounded-xl border border-black/[.15] bg-transparent px-4 py-3 outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
            />
            <button
              type="button"
              onClick={handleCorrect}
              disabled={!activeTopicPrompt || wordCount === 0 || isCorrecting || isRecentTopicLoading}
              className="self-start rounded-full bg-foreground px-5 py-2.5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
            >
              {isCorrecting ? "Correcting…" : "Correct"}
            </button>
            {isCorrecting && (
              <p role="status" className="sr-only">
                Getting your feedback. This can take a moment.
              </p>
            )}
            {correctError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {correctError}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2" aria-labelledby="translation-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="translation-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Translation ({APP_LOCALE_LABELS[locale]})
              </h2>
              {isTranslating && !isDraftTooLongToTranslate && (
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">Translating…</span>
              )}
            </div>
            <div
              role="status"
              aria-live="polite"
              className="min-h-16 w-full whitespace-pre-wrap rounded-xl border border-black/[.15] bg-black/[.02] px-4 py-3 text-sm text-zinc-700 dark:border-white/[.2] dark:bg-white/[.03] dark:text-zinc-300"
            >
              {isDraftTooLongToTranslate
                ? ""
                : visibleTranslation || (trimmedContent ? "" : "Your translation will appear here as you write.")}
            </div>
            {isDraftTooLongToTranslate ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Live translation is available for drafts up to {TRANSLATABLE_MAX_CHARS.toLocaleString()}{" "}
                characters. This draft is longer — submit it for correction to see full feedback.
              </p>
            ) : (
              visibleTranslationError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {visibleTranslationError}
                </p>
              )
            )}
          </section>

          {feedback && (
            <section
              ref={feedbackRef}
              tabIndex={-1}
              aria-labelledby="feedback-heading"
              className="flex flex-col gap-4 rounded-xl border border-black/[.1] p-5 outline-none focus:ring-2 focus:ring-foreground/40 dark:border-white/[.15]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="feedback-heading" className="text-lg font-semibold">
                  Feedback{feedbackLocale ? ` (${APP_LOCALE_LABELS[feedbackLocale]})` : ""}
                </h2>
                <span className="rounded-full bg-black/[.06] px-3 py-1 text-sm font-medium dark:bg-white/[.1]">
                  Estimated CEFR / CECRL level: {feedback.cefrLevel}
                </span>
              </div>

              <p
                className={`text-sm ${
                  feedback.meetsWordCount
                    ? "text-green-700 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {feedback.wordCountNote}
              </p>

              <p className="text-sm">{feedback.summary}</p>

              {feedbackLocale && feedbackLocale !== locale && (
                <p role="status" className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                  This feedback was generated in {APP_LOCALE_LABELS[feedbackLocale]}. Select Correct again to receive feedback in {APP_LOCALE_LABELS[locale]}.
                </p>
              )}

              {feedbackIsStale && (
                <p role="status" className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                  You&apos;ve edited your response since this feedback. Correct again for feedback on your latest draft.
                </p>
              )}

              <div>
                <h3 className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Corrected text
                </h3>
                <p className="whitespace-pre-wrap rounded-md bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">
                  {feedback.correctedText}
                </p>
              </div>

              {feedback.errors.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Errors ({feedback.errors.length})
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {feedback.errors.map((err, i) => (
                      <li key={i} className="rounded-md border border-black/[.08] p-3 text-sm dark:border-white/[.1]">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-red-600 line-through dark:text-red-400">
                            {err.original}
                          </span>
                          <span aria-hidden>→</span>
                          <span className="text-green-700 dark:text-green-400">{err.correction}</span>
                          <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs uppercase tracking-wide dark:bg-white/[.1]">
                            {err.category}
                          </span>
                        </div>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">{err.explanation}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.suggestions.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Suggestions
                  </h3>
                  <ul className="list-disc pl-5 text-sm">
                    {feedback.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingSwitch !== null}
        title="Discard your current work?"
        description={pendingSwitch?.description ?? ""}
        confirmLabel="Discard and switch"
        cancelLabel="Keep working"
        onConfirm={() => {
          const action = pendingSwitch;
          setPendingSwitch(null);
          action?.run();
        }}
        onCancel={() => setPendingSwitch(null)}
      />
    </div>
  );
}
