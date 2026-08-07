"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { CorrectionModal, type CorrectionModalState } from "@/components/correction-modal";
import { useDashboardNavGuard } from "@/components/dashboard-nav-guard";
import { TranslationProviderNotice } from "@/components/translation-provider-notice";
import { getCorrectionRequestKey } from "@/lib/correction-request-key";

interface RecentExamTopic {
  id: string;
  taskType: TaskType;
  title: string;
  prompt: string;
  sourceUrl: string;
  sourceMonth: string;
}

type TopicMode = "recent" | "custom" | null;
type RecentTopicErrorKind = "fetch" | "unavailable" | "notPublished";
type PendingSwitchKind = "task" | "topic" | "example" | "dashboard" | "clear";
type TranslationErrorKind = "rateLimited" | "monthlyQuota" | "unavailable";
type TranslationProviderKind = "deepl" | "unofficial";
type ExampleLevel = "B2" | "C1" | "C2";
type ExampleErrorKind = "dailyLimit" | "rateLimited" | "unavailable" | "generic";
const EXAMPLE_LEVELS: ExampleLevel[] = ["B2", "C1", "C2"];

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

// A Tâche 3 topic's prompt is built as "title\n\nDocument 1 :\n...\n\nDocument
// 2 :\n..." (see parseTaskThree in recent-exam-topics.ts) so the model
// answer generator sees the title alongside the source documents. The title
// is also shown on its own above the prompt, so displaying the prompt
// verbatim would show it twice -- strip just that leading duplicate for
// display. Other task types' prompts never start with their own title, so
// this is a no-op for them.
function promptWithoutLeadingTitle(title: string, prompt: string): string {
  const prefix = `${title}\n\n`;
  return prompt.startsWith(prefix) ? prompt.slice(prefix.length) : prompt;
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
  const router = useRouter();
  const { register: registerDashboardNavGuard, setNavigationBusy } = useDashboardNavGuard();

  const [taskType, setTaskType] = useState<TaskType | null>(null);
  const [topicMode, setTopicMode] = useState<TopicMode>(null);

  const [recentTopic, setRecentTopic] = useState<RecentExamTopic | null>(null);
  const [isRecentTopicLoading, setIsRecentTopicLoading] = useState(false);
  // Keep transient errors as stable states rather than translated strings.
  // A language switch can happen while either request is in flight, and the
  // message should follow the current interface language when it appears.
  const [recentTopicError, setRecentTopicError] = useState<RecentTopicErrorKind | null>(null);

  const [customTopic, setCustomTopic] = useState("");
  const [content, setContent] = useState("");

  const [isCorrecting, setIsCorrecting] = useState(false);
  // Keep only the failure state, not a localized message captured when the
  // request started. The learner can change the interface language while a
  // correction is pending, so the visible message must always use the copy
  // from the current render.
  const [hasCorrectionError, setHasCorrectionError] = useState(false);

  const [exampleLevel, setExampleLevel] = useState<ExampleLevel>("B2");
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [exampleError, setExampleError] = useState<ExampleErrorKind | null>(null);
  const [exampleNeedsTopic, setExampleNeedsTopic] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const copyStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);
  const [feedbackLocale, setFeedbackLocale] = useState<AppLocale | null>(null);
  // This key is written only after a valid response arrives. It lets the
  // workspace distinguish an unchanged successful correction from a failed
  // request, and makes an edit-and-revert behave truthfully.
  const [lastSuccessfulCorrectionKey, setLastSuccessfulCorrectionKey] = useState<string | null>(null);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionModalState, setCorrectionModalState] = useState<CorrectionModalState>("loading");
  const [correctionModalSession, setCorrectionModalSession] = useState(0);
  const [correctionEssayId, setCorrectionEssayId] = useState<string | null>(null);
  // A server-side duplicate can be discovered after a reload or in another
  // tab. Keep its owner-scoped ID long enough to send the learner straight to
  // the immutable record instead of presenting a generic failure.
  const [existingCorrectionEssayId, setExistingCorrectionEssayId] = useState<string | null>(null);
  const [inProgressCorrection, setInProgressCorrection] = useState<{
    key: string;
    retryAt: number;
  } | null>(null);
  const [submittedCorrectionText, setSubmittedCorrectionText] = useState("");
  const customTopicRef = useRef<HTMLTextAreaElement>(null);
  const recentTopicRequestId = useRef(0);
  const exampleRequestId = useRef(0);
  const exampleAbortController = useRef<AbortController | null>(null);
  const correctionRequestId = useRef(0);

  const [pendingSwitch, setPendingSwitch] = useState<{ kind: PendingSwitchKind; run: () => void } | null>(
    null
  );

  const [translation, setTranslation] = useState("");
  const [translationProvider, setTranslationProvider] = useState<TranslationProviderKind | null>(null);
  const [translationFor, setTranslationFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const [translationRequestFor, setTranslationRequestFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const [translationError, setTranslationError] = useState<TranslationErrorKind | null>(null);
  const [translationErrorFor, setTranslationErrorFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const translationRequestId = useRef(0);
  const lastTranslatedRef = useRef<{ text: string; locale: typeof locale } | null>(null);

  const task = taskType ? TASK_INSTRUCTIONS[taskType] : null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const isTopicLoading = isRecentTopicLoading;
  const activeTopicPrompt =
    topicMode === "recent"
      ? recentTopic?.prompt ?? ""
      : topicMode === "custom"
        ? customTopic.trim()
        : "";
  const correctionRequestKey = getCorrectionRequestKey({
    taskType,
    topic:
      topicMode === "recent" && recentTopic
        ? { kind: "recent", id: recentTopic.id }
        : topicMode === "custom"
          ? { kind: "custom", prompt: customTopic }
          : null,
    content,
  });
  const isCurrentDraftAlreadyCorrected =
    correctionRequestKey !== null && correctionRequestKey === lastSuccessfulCorrectionKey;
  const isCorrectionInProgressElsewhere =
    correctionRequestKey !== null &&
    correctionRequestKey === inProgressCorrection?.key;
  // Do not latch this state on the first keystroke. If a learner reverts the
  // draft and topic exactly to the assessed version, the saved feedback is
  // current again and a duplicate correction stays disabled.
  const feedbackIsStale = Boolean(feedback && !isCurrentDraftAlreadyCorrected);

  useEffect(() => {
    if (topicMode === "custom") customTopicRef.current?.focus();
  }, [topicMode]);

  // A claim from another tab/server expires after a short lease. Keep the
  // block tied to that exact correction key until then: changing and reverting
  // the draft remains truthful, while a request that genuinely died can be
  // retried without a page reload.
  useEffect(() => {
    if (!inProgressCorrection) return;

    const remaining = Math.max(0, inProgressCorrection.retryAt - Date.now());

    const timer = window.setTimeout(() => {
      setInProgressCorrection((current) =>
        current?.key === inProgressCorrection.key && current.retryAt === inProgressCorrection.retryAt
          ? null
          : current,
      );
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [inProgressCorrection]);

  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current) clearTimeout(copyStatusTimeoutRef.current);
      exampleAbortController.current?.abort();
    };
  }, []);

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
            setTranslationError(
              errorCode === "TRANSLATION_RATE_LIMITED"
                ? "rateLimited"
                : errorCode === "TRANSLATION_MONTHLY_QUOTA_REACHED"
                  ? "monthlyQuota"
                  : "unavailable",
            );
            setTranslationErrorFor({ text: trimmed, locale });
            return;
          }

          const data: unknown = await res.json();
          if (requestId !== translationRequestId.current) return;

          const nextTranslation =
            data && typeof data === "object" && typeof (data as { translation?: unknown }).translation === "string"
              ? (data as { translation: string }).translation
              : "";
          const nextProvider =
            data && typeof data === "object" && (data as { provider?: unknown }).provider === "unofficial"
              ? "unofficial"
              : "deepl";

          setTranslation(nextTranslation);
          setTranslationProvider(nextProvider);
          setTranslationFor({ text: trimmed, locale });
          lastTranslatedRef.current = { text: trimmed, locale };
        })
        .catch((error: unknown) => {
          if (
            requestId === translationRequestId.current &&
            !(error instanceof Error && error.name === "AbortError")
          ) {
            setTranslationError("unavailable");
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

  // Every committed draft follows the same translation path, whether it was
  // typed, pasted, or inserted by the study-example action. This keeps the
  // translated panel honest and avoids requiring an extra learner edit.
  function applyDraftContent(value: string) {
    setContent(value);
    setHasCorrectionError(false);
    // Keep a server-returned history ID while the learner experiments with a
    // revision. The link itself is rendered only when the current key matches
    // again, so edit-and-revert restores the useful route to the saved review.
    setTranslationError(null);
    setTranslationErrorFor(null);
    if (!value.trim()) {
      translationRequestId.current += 1;
      setTranslation("");
      setTranslationProvider(null);
      setTranslationFor(null);
      setTranslationError(null);
      setTranslationErrorFor(null);
      setTranslationRequestFor(null);
      lastTranslatedRef.current = null;
    }
  }

  function resetDraftAndFeedback() {
    setContent("");
    setFeedback(null);
    setFeedbackLocale(null);
    setLastSuccessfulCorrectionKey(null);
    setCorrectionModalOpen(false);
    setCorrectionModalState("loading");
    setCorrectionEssayId(null);
    setExistingCorrectionEssayId(null);
    setInProgressCorrection(null);
    setSubmittedCorrectionText("");
    setHasCorrectionError(false);
    setExampleError(null);
    setExampleNeedsTopic(false);
    translationRequestId.current += 1;
    setTranslation("");
    setTranslationProvider(null);
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

  function cancelPendingExampleRequest() {
    exampleRequestId.current += 1;
    exampleAbortController.current?.abort();
    exampleAbortController.current = null;
    setIsGeneratingExample(false);
    setExampleError(null);
  }

  function cancelPendingTopicRequests() {
    cancelPendingRecentTopicRequest();
    cancelPendingExampleRequest();
  }

  // Cancels an in-flight correction request without touching feedback/error
  // state — used when the workspace is being reset (a task switch) so a
  // response that resolves after the reset can never write into it, and so
  // a stale "Correcting…" status never lingers on the reset workspace.
  function cancelPendingCorrection() {
    correctionRequestId.current += 1;
    setIsCorrecting(false);
  }

  const closeCorrectionModal = useCallback(() => {
    setCorrectionModalOpen(false);
  }, []);

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
  function runOrConfirm(kind: PendingSwitchKind, run: () => void) {
    if (!hasUnsavedWork()) {
      run();
      return;
    }

    setPendingSwitch({ kind, run });
  }

  function resetForTask(next: TaskType) {
    if (next === taskType) return;

    runOrConfirm(
      "task",
      () => {
        cancelPendingTopicRequests();
        cancelPendingCorrection();
        setTaskType(next);
        setTopicMode(null);
        setRecentTopic(null);
        setRecentTopicError(null);
        setCustomTopic("");
        resetDraftAndFeedback();
      },
    );
  }

  // Unlike resetForTask, confirming here navigates away (this workspace
  // lives at /tasks; the dashboard is a separate page) rather than resetting
  // in place, so there's nothing to explicitly clear — the whole component
  // unmounts. cancelPendingCorrection above still protects the in-place
  // resets (task switches) that stay on this page.
  //
  // The isCorrecting check is a defensive backstop, not the primary guard:
  // the nav bar's disabled rendering can lag one paint behind isCorrecting
  // becoming true (it learns about it through the busy flag published
  // below), so this refuses to act even if a click slips through during
  // that window rather than relying solely on the button being disabled.
  function goToDashboard() {
    if (isCorrecting) return;
    runOrConfirm("dashboard", () => router.push("/dashboard"));
  }

  // A ref instead of a `[registerDashboardNavGuard]`-only dependency: the
  // registered callback must always see the latest state (taskType,
  // topicMode, unsaved content), not whatever it closed over when the
  // effect last ran, so the effect below registers a stable wrapper once
  // and this ref is what actually gets called. Published with
  // useLayoutEffect, not useEffect: a passive effect can still be pending
  // when a nav-bar click fires (e.g. immediately after typing a draft),
  // leaving the ref pointing at a stale closure that would wrongly treat
  // the workspace as empty and skip the discard confirmation.
  const goToDashboardRef = useRef(goToDashboard);
  useLayoutEffect(() => {
    goToDashboardRef.current = goToDashboard;
  });

  useEffect(() => {
    registerDashboardNavGuard(() => goToDashboardRef.current());
    return () => registerDashboardNavGuard(null);
  }, [registerDashboardNavGuard]);

  // The nav bar's Dashboard control lives outside this component; it can
  // only know a correction the server will persist regardless is in flight
  // through this shared flag, not through local isCorrecting state. Also
  // published with useLayoutEffect so the disabled state can never render a
  // paint behind isCorrecting becoming true — see goToDashboard's own
  // defensive check above for the case where a click still slips through.
  useLayoutEffect(() => {
    setNavigationBusy(isCorrecting);
    return () => setNavigationBusy(false);
  }, [isCorrecting, setNavigationBusy]);

  function chooseCustomTopic() {
    if (topicMode === "custom") {
      cancelPendingTopicRequests();
      setRecentTopicError(null);
      customTopicRef.current?.focus();
      return;
    }

    runOrConfirm(
      "topic",
      () => {
        cancelPendingTopicRequests();
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
      "topic",
      () => {
        void fetchRecentTopic(currentTaskType);
      },
    );
  }

  async function fetchRecentTopic(currentTaskType: TaskType) {
    cancelPendingExampleRequest();
    const requestId = ++recentTopicRequestId.current;
    setIsRecentTopicLoading(true);
    setRecentTopicError(null);

    try {
      const res = await fetch(
        `/api/topics/recent?taskType=${encodeURIComponent(currentTaskType)}`,
      );

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const errorCode =
          data && typeof data === "object" && "code" in data
            ? (data as { code?: unknown }).code
            : undefined;
        if (requestId === recentTopicRequestId.current) {
          setRecentTopicError(errorCode === "RECENT_EXAM_NOT_PUBLISHED" ? "notPublished" : "fetch");
        }
        return;
      }

      const data: unknown = await res.json();
      if (requestId !== recentTopicRequestId.current) return;

      const nextTopic = readRecentExamTopic(data, currentTaskType);
      if (!nextTopic) {
        setRecentTopicError("unavailable");
        return;
      }

      setRecentTopic(nextTopic);
      setCustomTopic("");
      setTopicMode("recent");
      resetDraftAndFeedback();
    } catch {
      if (requestId === recentTopicRequestId.current) {
        setRecentTopicError("fetch");
      }
    } finally {
      if (requestId === recentTopicRequestId.current) setIsRecentTopicLoading(false);
    }
  }

  async function handleCorrect() {
    if (
      !taskType ||
      !activeTopicPrompt ||
      !correctionRequestKey ||
      wordCount === 0 ||
      isTopicLoading ||
      isCorrecting ||
      isCorrectionInProgressElsewhere ||
      isCurrentDraftAlreadyCorrected
    ) {
      return;
    }

    const correctionLocale = locale;
    // Keep the exact submitted draft for the comparison tab. A correction is
    // useful only when it is compared with the version the model actually
    // assessed, not a later edit in the workspace.
    const submittedText = content;

    const topicContext =
      topicMode === "recent" && recentTopic
        ? { topicId: recentTopic.id }
        : { topicPrompt: activeTopicPrompt };

    const requestId = ++correctionRequestId.current;
    setIsCorrecting(true);
    setHasCorrectionError(false);
    setFeedback(null);
    setFeedbackLocale(null);
    setCorrectionEssayId(null);
    setExistingCorrectionEssayId(null);
    setInProgressCorrection(null);
    setSubmittedCorrectionText(submittedText);
    setCorrectionModalState("loading");
    setCorrectionModalSession((session) => session + 1);
    setCorrectionModalOpen(true);
    try {
      const res = await fetch("/api/essays/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          ...topicContext,
          content: submittedText,
          locale: correctionLocale,
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (
          requestId === correctionRequestId.current &&
          data &&
          typeof data === "object" &&
          (data as { code?: unknown }).code === "CORRECTION_ALREADY_EXISTS"
        ) {
          setLastSuccessfulCorrectionKey(correctionRequestKey);
          const essayId = (data as { essayId?: unknown }).essayId;
          setExistingCorrectionEssayId(typeof essayId === "string" ? essayId : null);
          setCorrectionModalOpen(false);
          return;
        }
        if (
          requestId === correctionRequestId.current &&
          data &&
          typeof data === "object" &&
          (data as { code?: unknown }).code === "CORRECTION_IN_PROGRESS"
        ) {
          const retryAtValue = (data as { retryAt?: unknown }).retryAt;
          const retryAt =
            typeof retryAtValue === "string" ? Date.parse(retryAtValue) : Number.NaN;
          setInProgressCorrection({
            key: correctionRequestKey,
            // A malformed or already-expired server timestamp should never
            // create a permanent client-side block.
            retryAt: Number.isFinite(retryAt) ? Math.max(retryAt, Date.now() + 1) : Date.now() + 5_000,
          });
          setCorrectionModalOpen(false);
          return;
        }
        throw new Error("Correction request failed");
      }

      const correction = data as { essayId: string; feedback: EssayFeedback };
      // The workspace may have been reset (a task switch) while this
      // request was in flight — a stale response must never write feedback
      // into whatever the learner has moved on to.
      if (requestId !== correctionRequestId.current) return;
      setFeedback(correction.feedback);
      setCorrectionEssayId(correction.essayId);
      setFeedbackLocale(correctionLocale);
      setLastSuccessfulCorrectionKey(correctionRequestKey);
      setCorrectionModalState("result");
    } catch {
      if (requestId === correctionRequestId.current) {
        setHasCorrectionError(true);
        setCorrectionModalState("error");
      }
    } finally {
      if (requestId === correctionRequestId.current) setIsCorrecting(false);
    }
  }

  // A generated example replaces the whole draft, so an existing draft
  // needs the same explicit confirmation as a destructive task/topic switch
  // before it is overwritten.
  function requestGenerateExample() {
    if (!taskType || isTopicLoading || isCorrecting || isGeneratingExample) return;

    // An example may only be generated for a topic the learner actually has
    // in front of them: pulled from the recent-exam source, or their own
    // pasted/typed prompt. There is no other trusted topic source. The
    // prerequisite is shown as a focused status message without calling the
    // API when the learner has not chosen one yet.
    if ((topicMode !== "recent" && topicMode !== "custom") || !activeTopicPrompt) {
      setExampleNeedsTopic(true);
      return;
    }

    setExampleNeedsTopic(false);

    if (content.trim()) {
      setPendingSwitch({ kind: "example", run: () => void generateExample() });
      return;
    }

    void generateExample();
  }

  async function generateExample() {
    if (!taskType || !activeTopicPrompt) return;

    const topicContext =
      topicMode === "recent" && recentTopic
        ? { topicId: recentTopic.id }
        : { topicPrompt: activeTopicPrompt };

    const requestId = ++exampleRequestId.current;
    const controller = new AbortController();
    exampleAbortController.current?.abort();
    exampleAbortController.current = controller;
    setIsGeneratingExample(true);
    setExampleError(null);
    setExampleNeedsTopic(false);
    try {
      const res = await fetch("/api/essays/example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, level: exampleLevel, ...topicContext }),
        signal: controller.signal,
      });

      if (requestId !== exampleRequestId.current) return;

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const errorCode =
          data && typeof data === "object" && "code" in data
            ? (data as { code?: unknown }).code
            : undefined;
        if (requestId !== exampleRequestId.current) return;
        setExampleError(
          errorCode === "EXAMPLE_DAILY_LIMIT_REACHED"
            ? "dailyLimit"
            : errorCode === "EXAMPLE_RATE_LIMITED" || errorCode === "EXAMPLE_GENERATION_IN_PROGRESS"
              ? "rateLimited"
              : errorCode === "EXAMPLE_GENERATOR_UNAVAILABLE" || errorCode === "EXAMPLE_CACHE_UNAVAILABLE"
                ? "unavailable"
                : "generic",
        );
        return;
      }

      const data: { text: string } = await res.json();
      if (requestId !== exampleRequestId.current) return;
      applyDraftContent(data.text);
    } catch (error) {
      if (requestId === exampleRequestId.current && !(error instanceof Error && error.name === "AbortError")) {
        setExampleError("generic");
      }
    } finally {
      if (requestId === exampleRequestId.current) {
        exampleAbortController.current = null;
        setIsGeneratingExample(false);
      }
    }
  }

  async function handleCopyContent() {
    if (!content.trim()) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }

    if (copyStatusTimeoutRef.current) clearTimeout(copyStatusTimeoutRef.current);
    copyStatusTimeoutRef.current = setTimeout(() => setCopyStatus("idle"), 2000);
  }

  function handleClearDraft() {
    if (!content.trim()) return;
    runOrConfirm("clear", () => resetDraftAndFeedback());
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
  const visibleTranslationErrorMessage =
    visibleTranslationError === "rateLimited"
      ? copy.workspace.translation.rateLimitedError
      : visibleTranslationError === "monthlyQuota"
        ? copy.workspace.translation.monthlyQuotaError
        : visibleTranslationError
          ? copy.workspace.translation.unavailableError
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
              disabled={isCorrecting || isGeneratingExample}
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
                disabled={isCorrecting || isTopicLoading || isGeneratingExample}
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
                disabled={isCorrecting || isGeneratingExample}
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
                {recentTopicError === "notPublished"
                  ? copy.workspace.topic.notPublishedError
                  : recentTopicError === "unavailable"
                    ? copy.workspace.topic.unavailableError
                    : copy.workspace.topic.fetchError}
              </p>
            )}

            {topicMode === "recent" && recentTopic && (
              <article
                aria-label={copy.workspace.topic.selectedRecentExamAriaLabel}
                className="rounded-xl border border-black/[.08] bg-black/[.02] p-4 dark:border-white/[.1] dark:bg-white/[.03]"
              >
                <h3 lang="fr" className="font-medium">{recentTopic.title}</h3>
                <p lang="fr" className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {promptWithoutLeadingTitle(recentTopic.title, recentTopic.prompt)}
                </p>
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
                    cancelPendingTopicRequests();
                    setCustomTopic(e.target.value);
                    if (e.target.value.trim()) setExampleNeedsTopic(false);
                    setHasCorrectionError(false);
                  }}
                  placeholder={copy.workspace.topic.customTopicPlaceholder}
                  rows={3}
                  maxLength={2000}
                  disabled={isCorrecting || isTopicLoading}
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
                cancelPendingTopicRequests();
                applyDraftContent(e.target.value);
              }}
              placeholder={copy.workspace.editor.frenchResponsePlaceholder}
              rows={14}
              maxLength={20000}
              disabled={isCorrecting || isTopicLoading || isGeneratingExample}
              aria-describedby="word-count"
              className="min-h-72 w-full rounded-xl border border-black/[.15] bg-transparent px-4 py-3 outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCorrect}
                disabled={
                  !activeTopicPrompt ||
                  wordCount === 0 ||
                  isCorrecting ||
                  isTopicLoading ||
                  isGeneratingExample ||
                  isCorrectionInProgressElsewhere ||
                  isCurrentDraftAlreadyCorrected
                }
                aria-describedby={isCurrentDraftAlreadyCorrected ? "already-corrected-note" : undefined}
                className="self-start rounded-full bg-foreground px-5 py-2.5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
              >
                {isCorrecting ? copy.workspace.editor.correcting : copy.workspace.editor.correct}
              </button>

              {feedback ? (
                <button
                  type="button"
                  onClick={() => {
                    setCorrectionModalState("result");
                    setCorrectionModalOpen(true);
                  }}
                  className="self-start rounded-full border border-violet-500/30 bg-violet-500/[.06] px-4 py-2.5 text-sm font-medium text-violet-800 transition-colors hover:bg-violet-500/[.12] dark:border-violet-400/35 dark:bg-violet-400/[.1] dark:text-violet-200 dark:hover:bg-violet-400/[.16]"
                >
                  {copy.workspace.correctionModal.viewCorrection}
                </button>
              ) : (
                existingCorrectionEssayId &&
                isCurrentDraftAlreadyCorrected && (
                  <Link
                    href={`/dashboard/history/${encodeURIComponent(existingCorrectionEssayId)}`}
                    className="self-start rounded-full border border-violet-500/30 bg-violet-500/[.06] px-4 py-2.5 text-sm font-medium text-violet-800 transition-colors hover:bg-violet-500/[.12] dark:border-violet-400/35 dark:bg-violet-400/[.1] dark:text-violet-200 dark:hover:bg-violet-400/[.16]"
                  >
                    {copy.workspace.correctionModal.viewCorrection}
                  </Link>
                )
              )}

              <div className="flex items-center gap-1 rounded-full border border-black/[.15] py-1 pl-1 pr-1 dark:border-white/[.2]">
                <label htmlFor="example-level" className="sr-only">
                  {copy.workspace.editor.exampleLevelLabel}
                </label>
                <select
                  id="example-level"
                  value={exampleLevel}
                  onChange={(e) => setExampleLevel(e.target.value as ExampleLevel)}
                  disabled={isCorrecting || isTopicLoading || isGeneratingExample}
                  className="rounded-full bg-transparent px-2 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {EXAMPLE_LEVELS.map((level) => (
                    <option key={level} value={level} className="text-black">
                      {level}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={requestGenerateExample}
                  disabled={isCorrecting || isTopicLoading || isGeneratingExample}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[.06]"
                >
                  {isGeneratingExample ? copy.workspace.editor.generatingExample : copy.workspace.editor.generateExample}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyContent}
                disabled={!content.trim()}
                className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {copyStatus === "copied"
                  ? copy.workspace.editor.copied
                  : copyStatus === "failed"
                    ? copy.workspace.editor.copyFailed
                    : copy.workspace.editor.copy}
              </button>
              <button
                type="button"
                onClick={handleClearDraft}
                disabled={!content.trim()}
                className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {copy.workspace.editor.clear}
              </button>
            </div>
            {isCorrecting && (
              <p role="status" className="sr-only">
                {copy.workspace.editor.correctingStatus}
              </p>
            )}
            {hasCorrectionError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {copy.workspace.editor.genericCorrectionError}
              </p>
            )}
            {isCorrectionInProgressElsewhere && (
              <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
                {copy.workspace.editor.correctionInProgress}
              </p>
            )}
            {isCurrentDraftAlreadyCorrected && (
              <p
                id="already-corrected-note"
                role="status"
                className="text-sm text-zinc-600 dark:text-zinc-300"
              >
                {copy.workspace.editor.alreadyCorrected}
              </p>
            )}
            {isGeneratingExample && (
              <p role="status" className="sr-only">
                {copy.workspace.editor.generatingExampleStatus}
              </p>
            )}
            {exampleError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {exampleError === "rateLimited"
                  ? copy.workspace.editor.exampleRateLimitedError
                  : exampleError === "dailyLimit"
                    ? copy.workspace.editor.exampleDailyLimitError
                  : exampleError === "unavailable"
                    ? copy.workspace.editor.exampleUnavailableError
                    : copy.workspace.editor.exampleGenericError}
              </p>
            )}
            {exampleNeedsTopic && (
              <p role="status" className="text-sm text-amber-600 dark:text-amber-400">
                {copy.workspace.editor.exampleNeedsTopicWarning}
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
            {locale !== "fr" && visibleTranslation && translationProvider && (
              <TranslationProviderNotice
                provider={translationProvider}
                unofficialFallbackNotice={copy.workspace.translation.unofficialFallbackNotice}
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
              visibleTranslationErrorMessage && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {visibleTranslationErrorMessage}
                </p>
              )
            )}
          </section>

        </>
      )}

      {task && (
        <CorrectionModal
          key={correctionModalSession}
          open={correctionModalOpen}
          state={correctionModalState}
          task={task}
          submissionId={correctionEssayId}
          originalText={submittedCorrectionText}
          feedback={feedback}
          feedbackLocale={feedbackLocale}
          locale={locale}
          isStale={feedbackIsStale}
          copy={copy}
          onClose={closeCorrectionModal}
          onRetry={() => void handleCorrect()}
        />
      )}

      <ConfirmDialog
        open={pendingSwitch !== null}
        title={copy.workspace.dialog.title}
        description={
          pendingSwitch?.kind === "task"
            ? copy.workspace.dialog.taskSwitchDescription
            : pendingSwitch?.kind === "topic"
              ? copy.workspace.dialog.topicSwitchDescription
              : pendingSwitch?.kind === "example"
                ? copy.workspace.dialog.exampleOverwriteDescription
                : pendingSwitch?.kind === "dashboard"
                  ? copy.workspace.dialog.dashboardSwitchDescription
                  : pendingSwitch?.kind === "clear"
                    ? copy.workspace.dialog.clearDraftDescription
                    : ""
        }
        confirmLabel={
          pendingSwitch?.kind === "example"
            ? copy.workspace.dialog.exampleOverwriteConfirm
            : pendingSwitch?.kind === "clear"
              ? copy.workspace.dialog.clearDraftConfirm
              : copy.workspace.dialog.confirm
        }
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
