"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskType } from "@prisma/client";
import type { EssayFeedback } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS, TASK_ORDER } from "@/lib/tcf-tasks";

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
  const [feedbackIsStale, setFeedbackIsStale] = useState(false);
  const feedbackRef = useRef<HTMLElement>(null);
  const customTopicRef = useRef<HTMLTextAreaElement>(null);
  const recentTopicRequestId = useRef(0);

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

  function resetDraftAndFeedback() {
    setContent("");
    setFeedback(null);
    setFeedbackIsStale(false);
    setCorrectError(null);
  }

  function cancelPendingRecentTopicRequest() {
    // Do not rely on a loading-state render to have committed yet: a learner
    // can start typing immediately after requesting a topic.
    recentTopicRequestId.current += 1;
    setIsRecentTopicLoading(false);
  }

  function confirmTopicChange() {
    if (!content.trim() && !feedback && !(topicMode === "custom" && customTopic.trim())) {
      return true;
    }

    return window.confirm("Change topic? This will clear your topic, draft, and feedback.");
  }

  function resetForTask(next: TaskType) {
    if (next === taskType) return;

    if (
      (content.trim() || customTopic.trim() || feedback) &&
      !window.confirm("Change task? This will clear your topic, draft, and feedback.")
    ) {
      return;
    }

    recentTopicRequestId.current += 1;
    setTaskType(next);
    setTopicMode(null);
    setRecentTopic(null);
    setIsRecentTopicLoading(false);
    setRecentTopicError(null);
    setCustomTopic("");
    resetDraftAndFeedback();
  }

  function chooseCustomTopic() {
    if (topicMode === "custom") {
      cancelPendingRecentTopicRequest();
      customTopicRef.current?.focus();
      return;
    }

    if (!confirmTopicChange()) return;

    recentTopicRequestId.current += 1;
    setIsRecentTopicLoading(false);
    setRecentTopicError(null);
    setTopicMode("custom");
    resetDraftAndFeedback();
  }

  async function getRecentTopic(currentTaskType: TaskType) {
    if (!confirmTopicChange()) return;

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
    if (!taskType || !activeTopicPrompt || wordCount === 0) return;

    const topicContext =
      topicMode === "recent" && recentTopic
        ? { topicId: recentTopic.id }
        : { topicPrompt: activeTopicPrompt };

    setIsCorrecting(true);
    setCorrectError(null);
    setFeedback(null);
    setFeedbackIsStale(false);
    try {
      const res = await fetch("/api/essays/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          ...topicContext,
          content,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong.");
      }

      const data: { feedback: EssayFeedback } = await res.json();
      setFeedback(data.feedback);
    } catch (error) {
      setCorrectError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsCorrecting(false);
    }
  }

  const wordCountInRange = task ? wordCount >= task.minWords && wordCount <= task.maxWords : true;

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
                  disabled={isCorrecting}
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
                setContent(e.target.value);
                setCorrectError(null);
                if (feedback) setFeedbackIsStale(true);
              }}
              placeholder="Écrivez votre texte ici…"
              rows={14}
              maxLength={20000}
              disabled={isCorrecting}
              aria-describedby="word-count"
              className="min-h-72 w-full rounded-xl border border-black/[.15] bg-transparent px-4 py-3 outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
            />
            <button
              type="button"
              onClick={handleCorrect}
              disabled={!activeTopicPrompt || wordCount === 0 || isCorrecting}
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

          {feedback && (
            <section
              ref={feedbackRef}
              tabIndex={-1}
              aria-labelledby="feedback-heading"
              className="flex flex-col gap-4 rounded-xl border border-black/[.1] p-5 outline-none focus:ring-2 focus:ring-foreground/40 dark:border-white/[.15]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="feedback-heading" className="text-lg font-semibold">
                  Feedback
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
    </div>
  );
}
