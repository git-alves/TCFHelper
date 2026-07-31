"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskType } from "@prisma/client";
import type { EssayFeedback } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS, TASK_ORDER } from "@/lib/tcf-tasks";
import {
  APP_LOCALE_INTL_TAGS,
  APP_LOCALE_LABELS,
  TRANSLATABLE_MAX_CHARS,
  type AppLocale,
} from "@/lib/app-locale";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GoogleTranslateAttribution } from "@/components/google-translate-attribution";

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

function formatSourceMonth(sourceMonth: string, locale: AppLocale) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(sourceMonth);
  if (!match) return sourceMonth;

  return new Intl.DateTimeFormat(APP_LOCALE_INTL_TAGS[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

export function WritingWorkspace() {
  const { locale } = useAppLocale();
  const copy = useAppCopy();

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
            const errorCode =
              data && typeof data === "object" && "code" in data
                ? (data as { code?: unknown }).code
                : undefined;
            throw new Error(
              errorCode === "TRANSLATION_NOT_CONFIGURED"
                ? copy.workspace.translation.notConfiguredError
                : copy.workspace.translation.unavailableError,
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
            setTranslationError(
              error instanceof Error ? error.message : copy.workspace.translation.unavailableError,
            );
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
  }, [content, copy, locale]);

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
      copy.workspace.dialog.taskSwitchDescription,
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
      copy.workspace.dialog.topicSwitchDescription,
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
      copy.workspace.dialog.topicSwitchDescription,
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
        throw new Error(copy.workspace.topic.fetchError);
      }

      const data: unknown = await res.json();
      if (requestId !== recentTopicRequestId.current) return;

      const nextTopic = readRecentExamTopic(data, currentTaskType);
      if (!nextTopic) {
        throw new Error(copy.workspace.topic.unavailableError);
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
            : copy.workspace.topic.fetchError,
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
        throw new Error(copy.workspace.editor.genericCorrectionError);
      }

      const data: { feedback: EssayFeedback } = await res.json();
      setFeedback(data.feedback);
      setFeedbackLocale(correctionLocale);
    } catch (error) {
      setCorrectError(
        error instanceof Error ? error.message : copy.workspace.editor.genericCorrectionError,
      );
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
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {copy.workspace.task.heading}
        </h2>
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
              <div lang="fr" className="font-medium">{TASK_INSTRUCTIONS[type].label}</div>
              <div lang="fr" className="text-sm text-zinc-500 dark:text-zinc-400">
                {TASK_INSTRUCTIONS[type].title}
              </div>
            </button>
          ))}
        </div>
        {task && (
          <div className="rounded-xl border border-black/[.08] bg-black/[.02] p-4 text-sm dark:border-white/[.1] dark:bg-white/[.03]">
            <p lang="fr">{task.description}</p>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {copy.workspace.task.targetLength({
                minWords: task.minWords,
                maxWords: task.maxWords,
              })}
            </p>
          </div>
        )}
      </section>

      {task && (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="topic-heading">
            <h2 id="topic-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {copy.workspace.topic.heading}
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
                <span className="block font-medium">{copy.workspace.topic.recentExamTitle}</span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.topic.recentExamDescription}
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
                <span className="block font-medium">{copy.workspace.topic.customTitle}</span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.topic.customDescription}
                </span>
              </button>
            </div>

            {isRecentTopicLoading && (
              <p role="status" aria-live="polite" className="text-sm text-zinc-500 dark:text-zinc-400">
                {copy.workspace.topic.loading}
              </p>
            )}

            {recentTopicError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {recentTopicError}
              </p>
            )}

            {topicMode === "recent" && recentTopic && (
              <article
                aria-label={copy.workspace.topic.selectedRecentExamAriaLabel}
                className="rounded-xl border border-black/[.08] bg-black/[.02] p-4 dark:border-white/[.1] dark:bg-white/[.03]"
              >
                <h3 lang="fr" className="font-medium">{recentTopic.title}</h3>
                <p lang="fr" className="mt-2 whitespace-pre-wrap text-sm leading-6">{recentTopic.prompt}</p>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.topic.sourceLabel}{" "}
                  <a
                    href={recentTopic.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {copy.workspace.topic.recentExamsSource({
                      month: formatSourceMonth(recentTopic.sourceMonth, locale),
                    })}
                  </a>
                </p>
              </article>
            )}

            {topicMode === "custom" && (
              <div>
                <label htmlFor="custom-topic" className="sr-only">
                  {copy.workspace.topic.customTopicLabel}
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
                  placeholder={copy.workspace.topic.customTopicPlaceholder}
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
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {copy.workspace.editor.heading}
              </h2>
              <span
                id="word-count"
                className={`shrink-0 text-sm ${
                  wordCountInRange
                    ? "text-zinc-500 dark:text-zinc-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {copy.workspace.editor.wordCount({
                  count: wordCount,
                  minWords: task.minWords,
                  maxWords: task.maxWords,
                })}
              </span>
            </div>
            <label htmlFor="essay-content" className="sr-only">
              {copy.workspace.editor.responseLabel}
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
              placeholder={copy.workspace.editor.frenchResponsePlaceholder}
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
              {isCorrecting ? copy.workspace.editor.correcting : copy.workspace.editor.correct}
            </button>
            {isCorrecting && (
              <p role="status" className="sr-only">
                {copy.workspace.editor.correctingStatus}
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
                {copy.workspace.translation.heading({ language: APP_LOCALE_LABELS[locale] })}
              </h2>
              {isTranslating && !isDraftTooLongToTranslate && (
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.translation.inProgress}
                </span>
              )}
            </div>
            <div
              role="status"
              aria-live="polite"
              className="min-h-16 w-full whitespace-pre-wrap rounded-xl border border-black/[.15] bg-black/[.02] px-4 py-3 text-sm text-zinc-700 dark:border-white/[.2] dark:bg-white/[.03] dark:text-zinc-300"
            >
              {isDraftTooLongToTranslate
                ? ""
                : visibleTranslation || (trimmedContent ? "" : copy.workspace.translation.empty)}
            </div>
            {locale !== "fr" && (
              <GoogleTranslateAttribution
                alt={copy.workspace.translation.googleAttributionAlt}
                notice={copy.workspace.translation.googleNotice}
              />
            )}
            {isDraftTooLongToTranslate ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {copy.workspace.translation.tooLong({
                  maxCharacters: new Intl.NumberFormat(APP_LOCALE_INTL_TAGS[locale]).format(
                    TRANSLATABLE_MAX_CHARS,
                  ),
                })}
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
              lang={feedbackLocale ?? locale}
              className="flex flex-col gap-4 rounded-xl border border-black/[.1] p-5 outline-none focus:ring-2 focus:ring-foreground/40 dark:border-white/[.15]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="feedback-heading" className="text-lg font-semibold">
                  {copy.workspace.feedback.heading({
                    language: feedbackLocale ? APP_LOCALE_LABELS[feedbackLocale] : "",
                  })}
                </h2>
                <span className="rounded-full bg-black/[.06] px-3 py-1 text-sm font-medium dark:bg-white/[.1]">
                  {copy.workspace.feedback.estimatedLevel({ level: feedback.cefrLevel })}
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
                  {copy.workspace.feedback.generatedInOtherLanguage({
                    generatedLanguage: APP_LOCALE_LABELS[feedbackLocale],
                    selectedLanguage: APP_LOCALE_LABELS[locale],
                  })}
                </p>
              )}

              {feedbackIsStale && (
                <p role="status" className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                  {copy.workspace.feedback.stale}
                </p>
              )}

              <div>
                <h3 className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.feedback.correctedText}
                </h3>
                <p lang="fr" className="whitespace-pre-wrap rounded-md bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">
                  {feedback.correctedText}
                </p>
              </div>

              {feedback.errors.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.feedback.errors({ count: feedback.errors.length })}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {feedback.errors.map((err, i) => (
                      <li key={i} className="rounded-md border border-black/[.08] p-3 text-sm dark:border-white/[.1]">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span lang="fr" className="text-red-600 line-through dark:text-red-400">
                            {err.original}
                          </span>
                          <span aria-hidden>→</span>
                          <span lang="fr" className="text-green-700 dark:text-green-400">{err.correction}</span>
                          <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs uppercase tracking-wide dark:bg-white/[.1]">
                            {copy.workspace.feedback.errorCategories[err.category]}
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
                    {copy.workspace.feedback.suggestions}
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
        title={copy.workspace.dialog.title}
        description={pendingSwitch?.description ?? ""}
        confirmLabel={copy.workspace.dialog.confirm}
        cancelLabel={copy.workspace.dialog.cancel}
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
