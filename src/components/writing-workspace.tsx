"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskType } from "@prisma/client";
import type { EssayFeedback } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS, TASK_ORDER } from "@/lib/tcf-tasks";

interface BankTopic {
  id: string;
  title: string;
  prompt: string;
}

type TopicMode = "bank" | "custom";

export function WritingWorkspace() {
  const [taskType, setTaskType] = useState<TaskType | null>(null);
  const [topicMode, setTopicMode] = useState<TopicMode>("bank");

  const [bankTopics, setBankTopics] = useState<BankTopic[]>([]);
  const [bankIndex, setBankIndex] = useState(0);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const [customTopic, setCustomTopic] = useState("");
  const [content, setContent] = useState("");

  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);
  const [feedbackIsStale, setFeedbackIsStale] = useState(false);
  const feedbackRef = useRef<HTMLElement>(null);
  const bankRequestId = useRef(0);

  const task = taskType ? TASK_INSTRUCTIONS[taskType] : null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const selectedBankTopic = bankTopics[bankIndex] ?? null;
  const activeTopicPrompt = topicMode === "bank" ? selectedBankTopic?.prompt ?? "" : customTopic.trim();

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  function resetDraftAndFeedback() {
    setContent("");
    setFeedback(null);
    setFeedbackIsStale(false);
    setCorrectError(null);
  }

  function confirmTopicChange() {
    if (!content.trim() && !feedback) return true;

    return window.confirm(
      "Change topic? This will clear your draft and feedback.",
    );
  }

  function resetForTask(next: TaskType) {
    if (next === taskType) return;

    if (
      (content.trim() || customTopic.trim() || feedback) &&
      !window.confirm("Change task? This will clear your topic, draft, and feedback.")
    ) {
      return;
    }

    bankRequestId.current += 1;
    setTaskType(next);
    setBankTopics([]);
    setBankIndex(0);
    setBankLoading(false);
    setBankError(null);
    setCustomTopic("");
    resetDraftAndFeedback();
  }

  function changeTopicMode(nextMode: TopicMode) {
    if (nextMode === topicMode || !confirmTopicChange()) return;

    setTopicMode(nextMode);
    resetDraftAndFeedback();
  }

  async function pullFromBank(currentTaskType: TaskType) {
    if (bankTopics.length > 1) {
      if (!confirmTopicChange()) return;

      setBankIndex((prev) => (prev + 1) % bankTopics.length);
      resetDraftAndFeedback();
      return;
    }

    if (selectedBankTopic && !confirmTopicChange()) return;

    const requestId = ++bankRequestId.current;
    setBankLoading(true);
    setBankError(null);
    try {
      const res = await fetch(`/api/topics?taskType=${currentTaskType}`);
      if (!res.ok) throw new Error("Failed to load topics.");
      const data: { topics: BankTopic[] } = await res.json();
      if (requestId !== bankRequestId.current) return;

      if (data.topics.length === 0) {
        setBankError("No topics available yet for this task. Try writing your own.");
        setBankTopics([]);
        return;
      }
      setBankTopics(data.topics);
      setBankIndex(0);
      if (selectedBankTopic) resetDraftAndFeedback();
    } catch {
      if (requestId === bankRequestId.current) {
        setBankError("Couldn't load the topic bank. Please try again.");
      }
    } finally {
      if (requestId === bankRequestId.current) setBankLoading(false);
    }
  }

  async function handleCorrect() {
    if (!taskType || !activeTopicPrompt || wordCount === 0) return;

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
          topicId: topicMode === "bank" ? selectedBankTopic?.id : undefined,
          topicPrompt: activeTopicPrompt,
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
      {/* Task selector */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">1. Choose a task</h2>
        <div className="flex gap-3">
          {TASK_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => resetForTask(type)}
              aria-pressed={taskType === type}
              disabled={isCorrecting}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
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
          <div className="rounded-lg border border-black/[.08] bg-black/[.02] p-4 text-sm dark:border-white/[.1] dark:bg-white/[.03]">
            <p>{task.description}</p>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Target length: {task.minWords}–{task.maxWords} words.
            </p>
          </div>
        )}
      </section>

      {task && (
        <>
          {/* Topic */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">2. Pick a topic</h2>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => changeTopicMode("bank")}
                aria-pressed={topicMode === "bank"}
                disabled={isCorrecting}
                className={`rounded-full border px-3 py-1 ${
                  topicMode === "bank"
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/[.15] dark:border-white/[.2]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Topic bank
              </button>
              <button
                type="button"
                onClick={() => changeTopicMode("custom")}
                aria-pressed={topicMode === "custom"}
                disabled={isCorrecting}
                className={`rounded-full border px-3 py-1 ${
                  topicMode === "custom"
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/[.15] dark:border-white/[.2]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Write my own
              </button>
            </div>

            {topicMode === "bank" ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => pullFromBank(taskType!)}
                  disabled={bankLoading || isCorrecting}
                  className="self-start rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
                >
                  {bankLoading
                    ? "Loading…"
                    : bankTopics.length > 0
                      ? "Next topic"
                      : "Pull a topic"}
                </button>
                {bankError && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {bankError}
                  </p>
                )}
                {selectedBankTopic && (
                  <p className="rounded-lg border border-black/[.08] p-3 text-sm dark:border-white/[.1]">
                    {selectedBankTopic.prompt}
                  </p>
                )}
              </div>
            ) : (
              <>
                <label htmlFor="custom-topic" className="sr-only">
                  Your topic or prompt
                </label>
                <textarea
                  id="custom-topic"
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    setCorrectError(null);
                    if (feedback) setFeedbackIsStale(true);
                  }}
                  placeholder="Paste or write the topic/prompt you want to respond to…"
                  rows={2}
                  maxLength={2000}
                  disabled={isCorrecting}
                  className="rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
                />
              </>
            )}
          </section>

          {/* Editor */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">3. Write</h2>
              <span
                id="word-count"
                className={`text-sm ${
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
                setContent(e.target.value);
                setCorrectError(null);
                if (feedback) setFeedbackIsStale(true);
              }}
              placeholder="Écrivez votre texte ici…"
              rows={10}
              maxLength={20000}
              disabled={isCorrecting}
              aria-describedby="word-count"
              className="rounded-md border border-black/[.15] bg-transparent px-3 py-2 outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
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

          {/* Feedback */}
          {feedback && (
            <section
              ref={feedbackRef}
              tabIndex={-1}
              aria-labelledby="feedback-heading"
              className="flex flex-col gap-4 rounded-lg border border-black/[.1] p-5 outline-none focus:ring-2 focus:ring-foreground/40 dark:border-white/[.15]"
            >
              <div className="flex items-center justify-between">
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
