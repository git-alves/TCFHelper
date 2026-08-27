"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { useWalkthroughWorkspaceScript } from "@/components/walkthrough-workspace-script";
import { WritingGuidePanel } from "@/components/writing-guide-panel";
import { getCorrectionRequestKey } from "@/lib/correction-request-key";
import { computeTranslationDelta } from "@/lib/translation-delta";
import {
  TIMED_TASK_PLANS,
  formatRemainingTime,
  getReachedTimedTaskPhases,
  getTimedTaskPhase,
  type TimedTaskPhaseId,
} from "@/lib/timed-task";
import type { WritingContextClassification } from "@/lib/guided-writing-classifier";
import { WALKTHROUGH_SAMPLE_ESSAY } from "@/lib/walkthrough-sample-essay";
import { getWalkthroughSampleFeedback } from "@/lib/walkthrough-sample-feedback";

interface RecentExamTopic {
  id: string;
  taskType: TaskType;
  title: string;
  prompt: string;
  sourceUrl: string;
  sourceMonth: string;
  guideContext: WritingContextClassification;
}

type TopicMode = "recent" | "custom" | null;
type RecentTopicErrorKind = "fetch" | "unavailable" | "notPublished";
type PendingSwitchKind = "task" | "topic" | "example" | "dashboard" | "admin" | "clear";
type TranslationErrorKind = "rateLimited" | "monthlyQuota" | "unavailable";
type TranslationProviderKind = "deepl" | "unofficial";
type TimedTaskStatus = "running" | "paused" | "expired";
interface TimedTaskSession {
  version: 1;
  taskType: TaskType;
  topicKey: string;
  status: TimedTaskStatus;
  // An absolute deadline means backgrounded tabs and delayed intervals still
  // show the true remaining time when the browser wakes up.
  endsAt: number | null;
  totalDurationMilliseconds: number;
  remainingMilliseconds: number;
  extraTimeAddedMilliseconds: number;
}
interface TimedTaskSummary {
  taskType: TaskType;
  targetDurationMilliseconds: number;
  elapsedMilliseconds: number;
  wordCount: number;
  reachedPhaseIds: readonly TimedTaskPhaseId[];
}
// Shared by the example generator and the writing guide -- one "target
// level" for the whole workspace rather than two adjacent B2/C1/C2 controls
// with different meanings. See docs/guided-writing.md.
type ExampleLevel = "B2" | "C1" | "C2";
type ExampleErrorKind = "dailyLimit" | "rateLimited" | "unavailable" | "generic";
const EXAMPLE_LEVELS: ExampleLevel[] = ["B2", "C1", "C2"];
const TARGET_LEVEL_STORAGE_KEY = "mytcflab:target-level";
const GUIDED_WRITING_OPEN_STORAGE_KEY = "mytcflab:guided-writing-open";
const TIMED_TASK_SESSION_STORAGE_KEY = "mytcflab:timed-task-session";
const WALKTHROUGH_GUIDED_WRITING_TOPIC = "Vous avez passé un week-end à Lyon. Écrivez à votre amie Marie pour raconter votre séjour, vos activités et ce qui vous a le plus marqué.";
const writingPreferenceListeners = new Set<() => void>();
const inMemoryWritingPreferences = new Map<string, string>();
let cachedTimedTaskSessionRaw: string | null | undefined;
let cachedTimedTaskSession: TimedTaskSession | null = null;

function isExampleLevel(value: unknown): value is ExampleLevel {
  return value === "B2" || value === "C1" || value === "C2";
}

function getStoredTargetLevel(): ExampleLevel {
  const stored = readWritingPreference(TARGET_LEVEL_STORAGE_KEY);
  return isExampleLevel(stored) ? stored : "B2";
}

function getStoredGuidedWritingOpen(): boolean {
  return readWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY) === "1";
}

function isTimedTaskSession(value: unknown): value is TimedTaskSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    (candidate.taskType === "TASK_1" || candidate.taskType === "TASK_2" || candidate.taskType === "TASK_3") &&
    typeof candidate.topicKey === "string" &&
    (candidate.status === "running" || candidate.status === "paused" || candidate.status === "expired") &&
    (typeof candidate.endsAt === "number" || candidate.endsAt === null) &&
    typeof candidate.totalDurationMilliseconds === "number" &&
    Number.isFinite(candidate.totalDurationMilliseconds) &&
    candidate.totalDurationMilliseconds > 0 &&
    typeof candidate.remainingMilliseconds === "number" &&
    Number.isFinite(candidate.remainingMilliseconds) &&
    typeof candidate.extraTimeAddedMilliseconds === "number" &&
    Number.isFinite(candidate.extraTimeAddedMilliseconds) &&
    candidate.extraTimeAddedMilliseconds >= 0
  );
}

function getStoredTimedTaskSession(): TimedTaskSession | null {
  const stored = readWritingPreference(TIMED_TASK_SESSION_STORAGE_KEY);
  if (stored === cachedTimedTaskSessionRaw) return cachedTimedTaskSession;

  cachedTimedTaskSessionRaw = stored;
  if (!stored) {
    cachedTimedTaskSession = null;
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    cachedTimedTaskSession = isTimedTaskSession(parsed) ? parsed : null;
    return cachedTimedTaskSession;
  } catch {
    cachedTimedTaskSession = null;
    return null;
  }
}

function readWritingPreference(key: string): string | null {
  const inMemoryValue = inMemoryWritingPreferences.get(key);
  if (inMemoryValue !== undefined) return inMemoryValue;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeWritingPreference(key: string, value: string): void {
  // Keep a per-tab fallback so unavailable browser storage does not discard a
  // learner's selection during the current page session.
  inMemoryWritingPreferences.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is a convenience only. Private browsing or restrictive browser
    // settings must not prevent the learner from writing or using the guide.
  }
  writingPreferenceListeners.forEach((listener) => listener());
}

function clearWritingPreference(key: string): void {
  inMemoryWritingPreferences.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage is optional; the in-memory state is still cleared.
  }
  writingPreferenceListeners.forEach((listener) => listener());
}

function persistTimedTaskSession(session: TimedTaskSession | null): void {
  if (session) {
    storeWritingPreference(TIMED_TASK_SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    clearWritingPreference(TIMED_TASK_SESSION_STORAGE_KEY);
  }
}

function fingerprintTopicPrompt(prompt: string): string {
  // Keep the persisted timing session tied to an exact custom prompt without
  // writing the prompt text itself into local storage.
  let hash = 2_166_136_261;
  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function subscribeToWritingPreferences(listener: () => void): () => void {
  writingPreferenceListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key) inMemoryWritingPreferences.delete(event.key);
    else inMemoryWritingPreferences.clear();
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", handleStorage);
  return () => {
    writingPreferenceListeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", handleStorage);
  };
}

function isWritingContextClassification(value: unknown): value is WritingContextClassification {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.profile === "string" &&
    (candidate.confidence === "deterministic" || candidate.confidence === "needs_confirmation")
  );
}

function readRecentExamTopic(value: unknown, expectedTaskType: TaskType): RecentExamTopic | null {
  if (!value || typeof value !== "object") return null;

  const topic = (value as { topic?: unknown }).topic;
  if (!topic || typeof topic !== "object") return null;

  const candidate = topic as Record<string, unknown>;
  const { id, taskType, title, prompt, sourceUrl, sourceMonth, guideContext } = candidate;
  if (
    typeof id !== "string" ||
    taskType !== expectedTaskType ||
    typeof title !== "string" ||
    typeof prompt !== "string" ||
    typeof sourceUrl !== "string" ||
    typeof sourceMonth !== "string" ||
    !isWritingContextClassification(guideContext)
  ) {
    return null;
  }

  return { id, taskType: expectedTaskType, title, prompt, sourceUrl, sourceMonth, guideContext };
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

// Grows the custom-topic textarea to fit its content instead of capping it
// at its `rows` and leaving the rest behind an internal scrollbar -- the
// learner needs to keep the whole pasted topic visible while writing.
// Resetting height to "auto" first is required for scrollHeight to shrink
// back down when text is deleted, not just grow. scrollHeight excludes
// border width, but this element is border-box (Tailwind's global
// preflight), so its border must be added back or the box ends up a
// couple pixels shorter than its own content and still scrolls internally.
function resizeCustomTopicTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  const { borderTopWidth, borderBottomWidth } = window.getComputedStyle(textarea);
  textarea.style.height = `${textarea.scrollHeight + parseFloat(borderTopWidth) + parseFloat(borderBottomWidth)}px`;
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
  const { register: registerWalkthroughScript } = useWalkthroughWorkspaceScript();
  // Set the moment the tour's own scripted action first runs (the
  // task-picker step selecting a task while none was picked yet) -- true
  // only when every subsequent scripted overwrite is our own doing, never
  // the learner's real in-progress work. Gates every other scripted step,
  // and tells resetWalkthroughDemo whether there is anything tour-authored
  // to discard when the tour closes.
  const walkthroughDemoActiveRef = useRef(false);
  // True only while the tour itself is showing CorrectionModal (the
  // correction-modal step) -- lets CorrectionModal skip its own focus trap
  // for just that step, since WalkthroughOverlay owns Tab/Escape for every
  // step. Real, non-tour use of the modal never sets this.
  const [isWalkthroughCorrectionPreview, setIsWalkthroughCorrectionPreview] = useState(false);

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
  const [isTimedTaskSetupOpen, setIsTimedTaskSetupOpen] = useState(false);
  const [isTimedTaskDurationEditing, setIsTimedTaskDurationEditing] = useState(false);
  const [timedTaskDurationMinutes, setTimedTaskDurationMinutes] = useState<number | null>(null);
  const [timedTaskSummary, setTimedTaskSummary] = useState<TimedTaskSummary | null>(null);
  const timedTaskSession = useSyncExternalStore<TimedTaskSession | null>(
    subscribeToWritingPreferences,
    getStoredTimedTaskSession,
    (): TimedTaskSession | null => null,
  );
  const [timedTaskNow, setTimedTaskNow] = useState(() => Date.now());
  const [timedTaskAnnouncement, setTimedTaskAnnouncement] = useState("");
  const hasAnnouncedTimedTaskFinalCheck = useRef(false);
  const updateTimedTaskSession = useCallback(
    (update: (current: TimedTaskSession | null) => TimedTaskSession | null): void => {
      persistTimedTaskSession(update(getStoredTimedTaskSession()));
    },
    [],
  );

  const [isCorrecting, setIsCorrecting] = useState(false);
  // Keep only the failure state, not a localized message captured when the
  // request started. The learner can change the interface language while a
  // correction is pending, so the visible message must always use the copy
  // from the current render.
  const [hasCorrectionError, setHasCorrectionError] = useState(false);

  // useSyncExternalStore serves the same defaults during SSR and hydration,
  // then reads the browser preference after hydration without a mismatched
  // initial tree. The storage wrapper falls back to in-memory state if the
  // browser blocks localStorage.
  const exampleLevel = useSyncExternalStore<ExampleLevel>(
    subscribeToWritingPreferences,
    getStoredTargetLevel,
    (): ExampleLevel => "B2",
  );
  const isGuidedWritingOpen = useSyncExternalStore(
    subscribeToWritingPreferences,
    getStoredGuidedWritingOpen,
    () => false,
  );
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

  // Hidden until the learner asks for it, and translated on demand rather
  // than live as they type -- each click sends at most the text that
  // wasn't already translated (see requestTranslation), since every call
  // spends from the same metered per-learner translation quota.
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [isTranslationLoading, setIsTranslationLoading] = useState(false);
  const [translation, setTranslation] = useState("");
  const [translationProvider, setTranslationProvider] = useState<TranslationProviderKind | null>(null);
  // What `translation` actually corresponds to -- the base case for "is the
  // draft unchanged" (skip re-translating), and for "was text only appended"
  // (translate just the new suffix and concatenate) in requestTranslation.
  const [translationFor, setTranslationFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const [translationError, setTranslationError] = useState<TranslationErrorKind | null>(null);
  const [translationErrorFor, setTranslationErrorFor] = useState<{
    text: string;
    locale: typeof locale;
  } | null>(null);
  const translationRequestId = useRef(0);
  const translationAbortController = useRef<AbortController | null>(null);
  // The toggle button's own `disabled={isTranslationLoading}` only takes
  // effect on the render after setIsTranslationLoading(true) commits, so it
  // can't stop a second requestTranslation() call that lands in the same
  // tick as the first (rapid/programmatic activation, not just a normal
  // click) -- this ref is set synchronously, before any state update, so
  // it closes that gap regardless of render timing.
  const isRequestingTranslationRef = useRef(false);

  const task = taskType ? TASK_INSTRUCTIONS[taskType] : null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const isTopicLoading = isRecentTopicLoading;
  const activeTopicPrompt =
    topicMode === "recent"
      ? recentTopic?.prompt ?? ""
      : topicMode === "custom"
        ? customTopic.trim()
        : "";
  // Topic changes should end a timed practice run instead of quietly timing
  // a different prompt. Custom prompts are fingerprinted so their text is
  // never kept in the persisted session.
  const timedTaskTopicKey =
    taskType && activeTopicPrompt
      ? topicMode === "recent" && recentTopic
        ? `${taskType}:recent:${recentTopic.id}`
        : `${taskType}:custom:${fingerprintTopicPrompt(activeTopicPrompt)}`
      : null;
  const timedTaskRemainingMilliseconds = timedTaskSession
    ? Math.max(
        0,
        timedTaskSession.status === "running" && timedTaskSession.endsAt !== null
          ? timedTaskSession.endsAt - timedTaskNow
          : timedTaskSession.remainingMilliseconds,
      )
    : 0;
  const timedTaskPhase = timedTaskSession
    ? getTimedTaskPhase(
        timedTaskSession.taskType,
        timedTaskRemainingMilliseconds,
        timedTaskSession.totalDurationMilliseconds,
      )
    : null;
  const timedTaskTime = formatRemainingTime(timedTaskRemainingMilliseconds);
  const timedTaskElapsedMilliseconds = timedTaskSession
    ? Math.min(
        timedTaskSession.totalDurationMilliseconds,
        Math.max(0, timedTaskSession.totalDurationMilliseconds - timedTaskRemainingMilliseconds),
      )
    : 0;
  const timedTaskSummaryElapsedTime = timedTaskSummary
    ? formatRemainingTime(timedTaskSummary.elapsedMilliseconds)
    : null;
  const timedTaskSummaryTargetTime = timedTaskSummary
    ? formatRemainingTime(timedTaskSummary.targetDurationMilliseconds)
    : null;
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
    if (topicMode !== "custom") return;
    customTopicRef.current?.focus();
    // A pasted topic prompt can be long, and the learner needs to keep
    // rereading all of it while writing the response -- growing the field
    // to fit its content (instead of a fixed height with an internal
    // scrollbar) means it never gets hidden behind a scroll.
    resizeCustomTopicTextarea(customTopicRef.current);
  }, [topicMode]);

  useEffect(() => {
    // A reload begins with no task/topic selected. Keep a stored timer until
    // the learner returns to its matching prompt; a real topic switch or a
    // draft reset clears it through resetDraftAndFeedback instead.
    if (!timedTaskSession || !timedTaskTopicKey || timedTaskSession.topicKey === timedTaskTopicKey) return;

    persistTimedTaskSession(null);
    hasAnnouncedTimedTaskFinalCheck.current = false;
  }, [timedTaskSession, timedTaskTopicKey]);

  useEffect(() => {
    if (timedTaskSession?.status !== "running" || timedTaskSession.endsAt === null) return;

    const updateClock = () => setTimedTaskNow(Date.now());
    updateClock();
    const interval = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(interval);
  }, [timedTaskSession?.endsAt, timedTaskSession?.status]);

  useEffect(() => {
    if (
      timedTaskSession?.status !== "running" ||
      timedTaskSession.endsAt === null ||
      timedTaskSession.endsAt > timedTaskNow
    ) {
      return;
    }

    updateTimedTaskSession((current) =>
      current?.status === "running" && current.endsAt !== null && current.endsAt <= timedTaskNow
        ? { ...current, status: "expired", endsAt: null, remainingMilliseconds: 0 }
        : current,
    );
    window.setTimeout(() => setTimedTaskAnnouncement(copy.workspace.timedTask.timeUp), 0);
  }, [copy.workspace.timedTask.timeUp, timedTaskNow, timedTaskSession?.endsAt, timedTaskSession?.status, updateTimedTaskSession]);

  useEffect(() => {
    if (
      timedTaskSession?.status !== "running" ||
      !timedTaskPhase ||
      timedTaskRemainingMilliseconds === 0 ||
      timedTaskRemainingMilliseconds > 2 * 60_000 ||
      hasAnnouncedTimedTaskFinalCheck.current
    ) {
      return;
    }

    hasAnnouncedTimedTaskFinalCheck.current = true;
    setTimedTaskAnnouncement(
      `${copy.workspace.timedTask.phaseLabels[timedTaskPhase.id]}. ${copy.workspace.timedTask.phasePrompts[timedTaskPhase.id]}`,
    );
  }, [copy.workspace.timedTask, timedTaskPhase, timedTaskRemainingMilliseconds, timedTaskSession?.status]);

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
      translationAbortController.current?.abort();
    };
  }, []);

  function cancelPendingTranslation() {
    translationRequestId.current += 1;
    translationAbortController.current?.abort();
    translationAbortController.current = null;
    setIsTranslationLoading(false);
    isRequestingTranslationRef.current = false;
  }

  // Translates on demand instead of live as the learner types, and sends at
  // most the text that wasn't already covered by `translation` -- every
  // call spends from the same metered per-learner quota (see
  // TRANSLATION_CHARACTERS_PER_MONTH in /api/translate), so re-translating
  // the whole draft on every click/keystroke would waste most of it on text
  // that was already translated a moment ago.
  async function requestTranslation() {
    // The button's own disabled state only reflects isTranslationLoading
    // after that state update commits, which isn't synchronous -- this ref
    // is, so it also covers a second call landing before that render (e.g.
    // rapid or programmatic activation, not just an ordinary click).
    if (isRequestingTranslationRef.current) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    // A French-language interface shows the learner's French draft
    // directly. This avoids an unnecessary model call that could otherwise
    // paraphrase their words rather than faithfully show the same-language
    // text.
    if (locale === "fr") {
      cancelPendingTranslation();
      setTranslation(content);
      setTranslationProvider(null);
      setTranslationFor({ text: trimmed, locale });
      setTranslationError(null);
      setTranslationErrorFor(null);
      return;
    }

    // Beyond this, /api/translate rejects the request outright (same shared
    // limit). The too-long notice below is derived straight from `content`,
    // so there is nothing to send here.
    if (trimmed.length > TRANSLATABLE_MAX_CHARS) return;

    const delta = computeTranslationDelta(trimmed, translationFor, locale);
    if (delta.kind === "unchanged") return;

    const isAppend = delta.kind === "append";
    const textToSend = delta.textToSend;
    // Both translation providers trim their output (see deepl-translate.ts
    // and unofficial-translate.ts), so the response can't be trusted to
    // carry the whitespace/newline that separated the new sentence from
    // what was already translated -- concatenating raw responses can join
    // "Hello" and "world" into "Helloworld". Capture that separator from
    // what was actually typed, before it's sent, and reinsert it on the
    // response instead.
    const appendSeparator = isAppend ? (/^\s*/.exec(textToSend)?.[0] ?? "") : "";

    cancelPendingTranslation();
    isRequestingTranslationRef.current = true;
    const requestId = translationRequestId.current;
    const controller = new AbortController();
    translationAbortController.current = controller;
    setIsTranslationLoading(true);
    setTranslationError(null);
    setTranslationErrorFor(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSend, targetLocale: locale }),
        signal: controller.signal,
      });

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

      const chunk =
        data && typeof data === "object" && typeof (data as { translation?: unknown }).translation === "string"
          ? (data as { translation: string }).translation
          : "";
      const nextProvider =
        data && typeof data === "object" && (data as { provider?: unknown }).provider === "unofficial"
          ? "unofficial"
          : "deepl";

      setTranslation((previous) => (isAppend ? `${previous}${appendSeparator}${chunk}` : chunk));
      setTranslationProvider(nextProvider);
      setTranslationFor({ text: trimmed, locale });
    } catch (error) {
      if (requestId === translationRequestId.current && !(error instanceof Error && error.name === "AbortError")) {
        setTranslationError("unavailable");
        setTranslationErrorFor({ text: trimmed, locale });
      }
    } finally {
      if (requestId === translationRequestId.current) {
        setIsTranslationLoading(false);
        isRequestingTranslationRef.current = false;
      }
    }
  }

  function handleToggleTranslation() {
    // Once shown, the same control keeps offering to (re)translate for as
    // long as the draft has moved on since the last translation -- only
    // hides when what's displayed is actually still in sync, matching
    // isTranslationStale below (recomputed here rather than closed over,
    // since this and the button label need the same answer independently).
    const isStale = computeTranslationDelta(content.trim(), translationFor, locale).kind !== "unchanged";
    if (isTranslationVisible && !isStale) {
      cancelPendingTranslation();
      setIsTranslationVisible(false);
      return;
    }

    setIsTranslationVisible(true);
    void requestTranslation();
  }

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
    // A translation in flight was requested for whatever the draft looked
    // like a moment ago -- any further edit makes it stale before it even
    // arrives, so there is no reason to let it finish and spend quota on
    // text that's already out of date.
    cancelPendingTranslation();
    if (!value.trim()) {
      setIsTranslationVisible(false);
      setTranslation("");
      setTranslationProvider(null);
      setTranslationFor(null);
      setTranslationError(null);
      setTranslationErrorFor(null);
    }
  }

  function resetDraftAndFeedback() {
    // Clearing a draft or loading/replacing a subject must not leave a timer
    // running invisibly against work the learner has intentionally reset.
    persistTimedTaskSession(null);
    setIsTimedTaskSetupOpen(false);
    setIsTimedTaskDurationEditing(false);
    setTimedTaskDurationMinutes(null);
    setTimedTaskSummary(null);
    setTimedTaskAnnouncement("");
    hasAnnouncedTimedTaskFinalCheck.current = false;
    setContent("");
    setFeedback(null);
    setFeedbackLocale(null);
    setLastSuccessfulCorrectionKey(null);
    setCorrectionModalOpen(false);
    setIsWalkthroughCorrectionPreview(false);
    setCorrectionModalState("loading");
    setCorrectionEssayId(null);
    setExistingCorrectionEssayId(null);
    setInProgressCorrection(null);
    setSubmittedCorrectionText("");
    setHasCorrectionError(false);
    setExampleError(null);
    setExampleNeedsTopic(false);
    cancelPendingTranslation();
    setIsTranslationVisible(false);
    setTranslation("");
    setTranslationProvider(null);
    setTranslationFor(null);
    setTranslationError(null);
    setTranslationErrorFor(null);
  }

  function startTimedTask() {
    if (!taskType || !timedTaskTopicKey) return;

    const recommendedMinutes = TIMED_TASK_PLANS[taskType].totalMinutes;
    const totalDurationMilliseconds = Math.max(1, timedTaskDurationMinutes ?? recommendedMinutes) * 60_000;
    const remainingMilliseconds = totalDurationMilliseconds;
    setTimedTaskNow(Date.now());
    persistTimedTaskSession({
      version: 1,
      taskType,
      topicKey: timedTaskTopicKey,
      status: "running",
      endsAt: Date.now() + remainingMilliseconds,
      totalDurationMilliseconds,
      remainingMilliseconds,
      extraTimeAddedMilliseconds: 0,
    });
    setIsTimedTaskSetupOpen(false);
    setTimedTaskSummary(null);
    hasAnnouncedTimedTaskFinalCheck.current = false;
    const firstPhase = TIMED_TASK_PLANS[taskType].phases[0];
    setTimedTaskAnnouncement(
      `${copy.workspace.timedTask.start}. ${copy.workspace.timedTask.phaseLabels[firstPhase.id]}. ${copy.workspace.timedTask.phasePrompts[firstPhase.id]}`,
    );
  }

  function pauseTimedTask() {
    updateTimedTaskSession((current) => {
      if (current?.status !== "running" || current.endsAt === null) return current;

      const remainingMilliseconds = Math.max(0, current.endsAt - Date.now());
      if (remainingMilliseconds === 0) {
        setTimedTaskAnnouncement(copy.workspace.timedTask.timeUp);
        return { ...current, status: "expired", endsAt: null, remainingMilliseconds: 0 };
      }

      setTimedTaskAnnouncement(copy.workspace.timedTask.pause);
      return { ...current, status: "paused", endsAt: null, remainingMilliseconds };
    });
  }

  function resumeTimedTask() {
    updateTimedTaskSession((current) => {
      if (current?.status !== "paused") return current;

      setTimedTaskNow(Date.now());
      setTimedTaskAnnouncement(copy.workspace.timedTask.resume);
      return { ...current, status: "running", endsAt: Date.now() + current.remainingMilliseconds };
    });
  }

  function endTimedTask() {
    const current = getStoredTimedTaskSession();
    if (current) {
      const remainingMilliseconds = Math.max(
        0,
        current.status === "running" && current.endsAt !== null
          ? current.endsAt - Date.now()
          : current.remainingMilliseconds,
      );
      const elapsedMilliseconds =
        Math.min(
          current.totalDurationMilliseconds,
          Math.max(0, current.totalDurationMilliseconds - remainingMilliseconds),
        ) + current.extraTimeAddedMilliseconds;
      const reachedPhaseIds = getReachedTimedTaskPhases(
        current.taskType,
        current.totalDurationMilliseconds - remainingMilliseconds,
        current.totalDurationMilliseconds,
      ).map((phase) => phase.id);

      setTimedTaskSummary({
        taskType: current.taskType,
        targetDurationMilliseconds: current.totalDurationMilliseconds,
        elapsedMilliseconds,
        wordCount,
        reachedPhaseIds,
      });
    }
    persistTimedTaskSession(null);
    setIsTimedTaskSetupOpen(false);
    setIsTimedTaskDurationEditing(false);
    setTimedTaskDurationMinutes(null);
    setTimedTaskAnnouncement("");
    hasAnnouncedTimedTaskFinalCheck.current = false;
  }

  function addTimedTaskMinutes() {
    const remainingMilliseconds = 2 * 60_000;
    setTimedTaskNow(Date.now());
    updateTimedTaskSession((current) =>
      current?.status === "expired"
        ? {
            ...current,
            status: "running",
            endsAt: Date.now() + remainingMilliseconds,
            remainingMilliseconds,
            extraTimeAddedMilliseconds: current.extraTimeAddedMilliseconds + remainingMilliseconds,
          }
        : current,
    );
    hasAnnouncedTimedTaskFinalCheck.current = false;
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
        // A guide left open for the previous task's writing situation
        // shouldn't carry over to a task the learner hasn't picked a topic
        // for yet -- the button re-opens it in one click if wanted.
        storeWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY, "0");
      },
    );
  }

  // Unlike resetForTask, confirming here navigates away (this workspace
  // lives at /tasks; every guarded destination is a separate page) rather
  // than resetting in place, so there's nothing to explicitly clear — the
  // whole component unmounts. cancelPendingCorrection above still protects
  // the in-place resets (task switches) that stay on this page.
  //
  // The isCorrecting check is a defensive backstop, not the primary guard:
  // the nav bar's disabled rendering can lag one paint behind isCorrecting
  // becoming true (it learns about it through the busy flag published
  // below), so this refuses to act even if a click slips through during
  // that window rather than relying solely on the button being disabled.
  function goToDestination(destination: string) {
    if (isCorrecting) return;
    const kind: PendingSwitchKind = destination === "/admin" ? "admin" : "dashboard";
    runOrConfirm(kind, () => router.push(destination));
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
  const goToDestinationRef = useRef(goToDestination);
  useLayoutEffect(() => {
    goToDestinationRef.current = goToDestination;
  });

  useEffect(() => {
    registerDashboardNavGuard((destination) => goToDestinationRef.current(destination));
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

      // A newly loaded subject must not expose guidance the learner did not
      // ask to see. The Writing guide remains an explicit, per-subject choice
      // even when it was open for the topic being replaced.
      storeWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY, "0");
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

  // What the /tasks tour's Next-button-driven steps actually do to this
  // workspace, keyed by WalkthroughStepContent.id (see
  // TasksWalkthroughRunner). Every action is guarded by
  // walkthroughDemoActiveRef and, individually, by the same "only if still
  // empty" check resetForTask/fetchRecentTopic already use elsewhere --
  // never overwrites a real task/topic/draft a returning learner already
  // had in progress when they replayed the tour. The correction preview
  // reuses the real result UI (CorrectionModal, feedback state) with a
  // fixture instead of a POST to /api/essays/correct, so no permanent
  // history record or API cost is created for a demo essay -- see
  // walkthrough-sample-feedback.ts.
  // Returns true when the step has nothing to show and the runner should
  // advance past it immediately, rather than leaving the tour stalled on a
  // target that will never exist -- only the correction-modal step can end
  // up in that situation (see its own case below).
  function applyWalkthroughStep(stepId: string): boolean {
    if (stepId !== "correct-button" && stepId !== "correction-modal") {
      setCorrectionModalOpen(false);
      setIsWalkthroughCorrectionPreview(false);
    }

    switch (stepId) {
      case "task-picker": {
        if (taskType !== null) return false;
        walkthroughDemoActiveRef.current = true;
        setTaskType(TASK_ORDER[0]);
        return false;
      }
      case "topic-picker": {
        if (!walkthroughDemoActiveRef.current || topicMode !== null) return false;
        getRecentTopic(taskType ?? TASK_ORDER[0]);
        return false;
      }
      case "guided-writing": {
        if (!walkthroughDemoActiveRef.current) return false;
        // The recent-topic request the previous tour step begins is useful
        // in normal use, but this scripted guide preview needs a stable
        // prompt immediately. Invalidate the request before switching to the
        // matching personal-message scenario so a late response cannot
        // replace the panel underneath the tour.
        cancelPendingRecentTopicRequest();
        setRecentTopic(null);
        setRecentTopicError(null);
        setTopicMode("custom");
        setCustomTopic(WALKTHROUGH_GUIDED_WRITING_TOPIC);
        storeWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY, "1");
        return false;
      }
      case "editor": {
        if (!walkthroughDemoActiveRef.current || content.trim()) return false;
        // The topic-picker step's fetch may still be in flight -- its own
        // success handler unconditionally calls resetDraftAndFeedback(),
        // which would wipe the sample text this step is about to paste in
        // the moment that late response lands. Invalidating it here (the
        // same guard fetchRecentTopic already checks) means a late arrival
        // is a harmless no-op instead.
        cancelPendingRecentTopicRequest();
        storeWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY, "0");
        applyDraftContent(WALKTHROUGH_SAMPLE_ESSAY);
        return false;
      }
      case "correction-modal": {
        // WalkthroughOverlay owns Tab/Escape for this step (see
        // CorrectionModal's suppressFocusTrap prop) -- set for both
        // branches below, since either one shows the modal as part of the
        // tour, not as a standalone dialog.
        setIsWalkthroughCorrectionPreview(true);
        // A returning learner who already has a real correction can still
        // see this step -- reopening their own real result, never the
        // fixture, since resetWalkthroughDemo below only ever discards
        // tour-authored state.
        if (feedback) {
          setCorrectionModalState("result");
          setCorrectionModalOpen(true);
          return false;
        }
        // Outside the demo, with no real correction either (a returning
        // learner who picked a task before ever opening the tour, but
        // hasn't corrected anything yet), there is nothing to preview:
        // fabricating feedback for content that was never actually
        // submitted would show comments that don't match whatever real
        // text is in the editor. Skip straight past this step instead of
        // leaving the tour stalled on a target that will never appear.
        if (!walkthroughDemoActiveRef.current) {
          setIsWalkthroughCorrectionPreview(false);
          return true;
        }
        setSubmittedCorrectionText(content || WALKTHROUGH_SAMPLE_ESSAY);
        setFeedback(getWalkthroughSampleFeedback(copy));
        setFeedbackLocale(locale);
        setCorrectionModalState("result");
        setCorrectionModalSession((session) => session + 1);
        setCorrectionModalOpen(true);
        return false;
      }
      default:
        return false;
    }
  }

  function resetWalkthroughDemo() {
    setIsWalkthroughCorrectionPreview(false);
    if (!walkthroughDemoActiveRef.current) return;
    walkthroughDemoActiveRef.current = false;
    // A topic fetch from the topic-picker step can still be in flight when
    // the tour is skipped/finished -- without this, its success handler
    // would repopulate the topic (and wipe whatever the learner has done
    // since) into a workspace the tour has already reset.
    cancelPendingRecentTopicRequest();
    setTaskType(null);
    setTopicMode(null);
    setRecentTopic(null);
    setRecentTopicError(null);
    setCustomTopic("");
    resetDraftAndFeedback();
    storeWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY, "0");
  }

  const walkthroughScriptRef = useRef<{ applyStep: typeof applyWalkthroughStep; resetDemo: typeof resetWalkthroughDemo }>({
    applyStep: applyWalkthroughStep,
    resetDemo: resetWalkthroughDemo,
  });
  // Same reasoning as goToDashboardRef above: the registered handlers must
  // always see this render's state, not whatever they closed over when the
  // registration effect last ran.
  useLayoutEffect(() => {
    walkthroughScriptRef.current = { applyStep: applyWalkthroughStep, resetDemo: resetWalkthroughDemo };
  });

  useEffect(() => {
    registerWalkthroughScript({
      applyStep: (stepId) => walkthroughScriptRef.current.applyStep(stepId),
      resetDemo: () => walkthroughScriptRef.current.resetDemo(),
    });
    return () => registerWalkthroughScript(null);
  }, [registerWalkthroughScript]);

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
    setIsWalkthroughCorrectionPreview(false);
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
  const isTranslating = isTranslationLoading;
  // Whether what's currently shown (if anything) still matches the draft --
  // drives both the toggle button's label and, mirrored in
  // handleToggleTranslation, whether clicking it hides or (re)translates.
  const isTranslationStale = computeTranslationDelta(trimmedContent, translationFor, locale).kind !== "unchanged";
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
  // The last translation actually fetched, even once the draft has moved on
  // from it -- translation is on-demand now, not live, so a stale (but
  // still accurate for the text it covers) translation stays visible until
  // the learner re-opens the panel, rather than blanking on every keystroke
  // while the button still reads "Hide translation". This tolerance is only
  // for the DRAFT changing, though: a translation into a language the
  // interface has since moved away from isn't stale, it's simply wrong for
  // what's on screen now (the heading above it already updates to the new
  // language), so a locale mismatch still blanks it. A French interface
  // simply shows the original French draft.
  const visibleTranslation =
    locale === "fr" ? content : translationFor?.locale === locale ? translation : "";

  return (
    <div className="flex w-full flex-col gap-8">

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {copy.workspace.task.heading}
        </h2>
        <div data-walkthrough="task-picker" className="grid gap-3 sm:grid-cols-3">
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
            <div data-walkthrough="topic-picker" className="grid gap-3 sm:grid-cols-2">
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
                    resizeCustomTopicTextarea(e.target);
                  }}
                  placeholder={copy.workspace.topic.customTopicPlaceholder}
                  rows={3}
                  maxLength={2000}
                  disabled={isCorrecting || isTopicLoading}
                  className="w-full resize-none overflow-hidden rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm outline-none focus:border-black/[.4] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-white/[.5]"
                />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {copy.workspace.editor.heading}
                </h2>
                <div className="flex items-center gap-1 rounded-full border border-black/[.15] py-1 pl-3 pr-1 dark:border-white/[.2]">
                  <label htmlFor="target-level" className="text-sm text-zinc-600 dark:text-zinc-300">
                    {copy.workspace.editor.exampleLevelLabel}
                  </label>
                  <select
                    id="target-level"
                    value={exampleLevel}
                    onChange={(e) => {
                      const level = e.target.value;
                      if (isExampleLevel(level)) storeWritingPreference(TARGET_LEVEL_STORAGE_KEY, level);
                    }}
                    disabled={isCorrecting || isTopicLoading || isGeneratingExample}
                    className="rounded-full bg-transparent px-2 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {EXAMPLE_LEVELS.map((level) => (
                      <option key={level} value={level} className="text-black">
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  data-walkthrough="guided-writing"
                  onClick={() =>
                    storeWritingPreference(GUIDED_WRITING_OPEN_STORAGE_KEY, isGuidedWritingOpen ? "0" : "1")
                  }
                  disabled={!activeTopicPrompt}
                  aria-pressed={isGuidedWritingOpen}
                  className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
                >
                  {isGuidedWritingOpen ? copy.workspace.guidedWriting.hide : copy.workspace.guidedWriting.show}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    data-walkthrough="timed-task"
                    onClick={() => setIsTimedTaskSetupOpen((open) => !open)}
                    disabled={!activeTopicPrompt || Boolean(timedTaskSession)}
                    aria-expanded={isTimedTaskSetupOpen}
                    aria-controls="timed-task-setup"
                    className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
                  >
                    <span aria-hidden="true">⏱ </span>
                    {copy.workspace.timedTask.show}
                  </button>
                  {isTimedTaskSetupOpen && taskType && task && !timedTaskSession && (
                    <div
                      id="timed-task-setup"
                      role="region"
                      aria-label={copy.workspace.timedTask.heading}
                      className="absolute left-0 z-20 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border border-black/[.15] bg-background p-4 shadow-lg dark:border-white/[.2]"
                    >
                      <div>
                        <h3 className="text-sm font-medium">
                          {copy.workspace.timedTask.recommendedPace({
                            task: task.label,
                            minutes: timedTaskDurationMinutes ?? TIMED_TASK_PLANS[taskType].totalMinutes,
                          })}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                          {copy.workspace.timedTask.setupDescription}
                        </p>
                      </div>
                      <ol className="flex flex-col gap-2 text-sm">
                        {TIMED_TASK_PLANS[taskType].phases.map((phase) => (
                          <li key={phase.id} className="flex gap-2">
                            <span className="shrink-0 font-medium">
                              {copy.workspace.timedTask.phaseLabels[phase.id]} · {phase.durationMilliseconds / 60_000} min
                            </span>
                            <span className="text-zinc-600 dark:text-zinc-300">
                              {copy.workspace.timedTask.phasePrompts[phase.id]}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {isTimedTaskDurationEditing ? (
                        <label className="flex items-center gap-2 text-sm">
                          <span>{copy.workspace.timedTask.durationLabel}</span>
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={timedTaskDurationMinutes ?? TIMED_TASK_PLANS[taskType].totalMinutes}
                            onChange={(event) => {
                              const nextMinutes = event.currentTarget.valueAsNumber;
                              setTimedTaskDurationMinutes(
                                Number.isFinite(nextMinutes) ? Math.min(Math.max(Math.round(nextMinutes), 1), 180) : null,
                              );
                            }}
                            className="w-16 rounded-md border border-black/[.2] bg-transparent px-2 py-1 text-right outline-none focus:border-violet-600 dark:border-white/[.25] dark:focus:border-violet-400"
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsTimedTaskDurationEditing(true)}
                          className="self-start text-sm underline underline-offset-2 hover:text-foreground"
                        >
                          {copy.workspace.timedTask.changeDuration}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={startTimedTask}
                        className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                      >
                        {copy.workspace.timedTask.start}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
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
                {timedTaskSession && timedTaskPhase && (
                  <span className="rounded-full border border-violet-500/30 px-2 py-1 font-mono text-sm font-semibold tabular-nums dark:border-violet-400/35">
                    <span className="sr-only">{copy.workspace.timedTask.phaseLabels[timedTaskPhase.id]}: </span>
                    ⏱ {timedTaskTime.minutes}:{timedTaskTime.seconds}
                  </span>
                )}
              </div>
            </div>
            {isGuidedWritingOpen && taskType && (topicMode === "recent" || topicMode === "custom") && activeTopicPrompt && (
              <WritingGuidePanel
                key={`${taskType}:${topicMode}:${topicMode === "recent" ? recentTopic?.id ?? "" : ""}`}
                taskType={taskType}
                topicMode={topicMode}
                recentTopicContext={topicMode === "recent" ? recentTopic?.guideContext ?? null : null}
                customTopicPrompt={topicMode === "custom" ? customTopic : ""}
                level={exampleLevel}
                locale={locale}
                copy={copy}
                timedTaskCue={
                  timedTaskSession && timedTaskPhase
                    ? {
                        label: copy.workspace.timedTask.phaseLabels[timedTaskPhase.id],
                        prompt: copy.workspace.timedTask.phasePrompts[timedTaskPhase.id],
                      }
                    : null
                }
              />
            )}
            {timedTaskSession && timedTaskPhase && (
              <div
                className="sticky top-2 z-10 flex flex-col gap-2 rounded-xl border border-violet-500/30 bg-background/95 p-3 shadow-sm backdrop-blur dark:border-violet-400/35"
                aria-label={copy.workspace.timedTask.heading}
              >
                <p className="sr-only" aria-live="polite" aria-atomic="true">
                  {timedTaskAnnouncement}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span aria-hidden="true">⏱ </span>
                      {copy.workspace.timedTask.heading} · {copy.workspace.timedTask.phaseLabels[timedTaskPhase.id]}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {timedTaskSession.status === "expired"
                        ? copy.workspace.timedTask.timeUp
                        : copy.workspace.timedTask.phasePrompts[timedTaskPhase.id]}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <time className="font-mono text-lg font-semibold tabular-nums" aria-live="off">
                      {copy.workspace.timedTask.remaining(timedTaskTime)}
                    </time>
                    {timedTaskSession.status === "running" ? (
                      <button
                        type="button"
                        onClick={pauseTimedTask}
                        className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                      >
                        {copy.workspace.timedTask.pause}
                      </button>
                    ) : timedTaskSession.status === "paused" ? (
                      <button
                        type="button"
                        onClick={resumeTimedTask}
                        className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                      >
                        {copy.workspace.timedTask.resume}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={addTimedTaskMinutes}
                        className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                      >
                        {copy.workspace.timedTask.continueForTwoMinutes}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={endTimedTask}
                      className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                    >
                      {copy.workspace.timedTask.end}
                    </button>
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-label={copy.workspace.timedTask.heading}
                  aria-valuemin={0}
                  aria-valuemax={timedTaskSession.totalDurationMilliseconds / 1_000}
                  aria-valuenow={Math.round(timedTaskElapsedMilliseconds / 1_000)}
                  className="h-1 overflow-hidden rounded-full bg-violet-500/15 dark:bg-violet-400/15"
                >
                  <div
                    className="h-full bg-violet-600 transition-[width] duration-1000 dark:bg-violet-400"
                    style={{
                      width: `${Math.round(
                        (timedTaskElapsedMilliseconds / timedTaskSession.totalDurationMilliseconds) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {timedTaskSummary && timedTaskSummaryElapsedTime && timedTaskSummaryTargetTime && (
              <section
                role="status"
                aria-label={copy.workspace.timedTask.summaryHeading}
                className="flex flex-col gap-3 rounded-xl border border-violet-500/30 bg-violet-500/[.06] p-4 dark:border-violet-400/35 dark:bg-violet-400/[.1]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium">{copy.workspace.timedTask.summaryHeading}</h3>
                  <button
                    type="button"
                    onClick={() => setTimedTaskSummary(null)}
                    className="rounded-full border border-black/[.15] px-3 py-1 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                  >
                    {copy.workspace.timedTask.summaryClose}
                  </button>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {copy.workspace.timedTask.summaryActualTime({
                      time: `${timedTaskSummaryElapsedTime.minutes}:${timedTaskSummaryElapsedTime.seconds}`,
                    })}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {copy.workspace.timedTask.summaryTargetTime({
                      time: `${timedTaskSummaryTargetTime.minutes}:${timedTaskSummaryTargetTime.seconds}`,
                    })}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {copy.workspace.timedTask.summaryWordCount({ count: timedTaskSummary.wordCount })}
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {TIMED_TASK_PLANS[timedTaskSummary.taskType].phases.map((phase) => {
                    const reached = timedTaskSummary.reachedPhaseIds.includes(phase.id);
                    return (
                      <li
                        key={phase.id}
                        className="rounded-full border border-black/[.12] px-2 py-1 dark:border-white/[.2]"
                      >
                        <span aria-hidden="true">{reached ? "✓" : "–"} </span>
                        {copy.workspace.timedTask.phaseLabels[phase.id]}: {reached
                          ? copy.workspace.timedTask.summaryPhaseReached
                          : copy.workspace.timedTask.summaryPhaseNotReached}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <label htmlFor="essay-content" className="sr-only">
              {copy.workspace.editor.responseLabel}
            </label>
            <textarea
              id="essay-content"
              data-walkthrough="editor"
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
              className="min-h-72 w-full rounded-xl border border-black/[.2] bg-black/[.02] px-4 py-3 outline-none transition-colors placeholder:font-medium placeholder:text-zinc-600 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.25] dark:bg-white/[.03] dark:focus:border-violet-400 dark:placeholder:text-zinc-400"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-walkthrough="correct-button"
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

              <div
                data-walkthrough="example-generate"
                className="flex rounded-full border border-black/[.15] p-1 dark:border-white/[.2]"
              >
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
                data-walkthrough="editor-copy"
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
                data-walkthrough="editor-clear"
                onClick={handleClearDraft}
                disabled={!content.trim()}
                className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {copy.workspace.editor.clear}
              </button>
              <button
                type="button"
                data-walkthrough="translation"
                onClick={handleToggleTranslation}
                // Also disabled while loading: each click that lands during
                // an in-flight request aborts it and starts another, and
                // the server intentionally keeps the quota reservation for
                // the aborted one (see the no-refund note in
                // /api/translate/route.ts) -- repeated clicks here would
                // burn real quota on requests that never even finish.
                disabled={!content.trim() || isTranslationLoading}
                aria-pressed={isTranslationVisible && !isTranslationStale}
                className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {!isTranslationVisible
                  ? copy.workspace.translation.show
                  : isTranslationStale
                    ? copy.workspace.translation.update
                    : copy.workspace.translation.hide}
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

          {isTranslationVisible && (
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
                className="min-h-16 w-full whitespace-pre-wrap break-words rounded-xl border border-black/[.15] bg-black/[.02] px-4 py-3 text-sm text-zinc-700 dark:border-white/[.2] dark:bg-white/[.03] dark:text-zinc-300"
              >
                {isDraftTooLongToTranslate ? "" : visibleTranslation}
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
          )}

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
          suppressFocusTrap={isWalkthroughCorrectionPreview}
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
                  : pendingSwitch?.kind === "admin"
                    ? copy.workspace.dialog.adminSwitchDescription
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
