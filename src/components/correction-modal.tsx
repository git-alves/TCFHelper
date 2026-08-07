"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { AppCopy } from "@/lib/app-copy";
import { APP_LOCALE_LABELS, type AppLocale } from "@/lib/app-locale";
import { CEFR_LEVELS, type EssayFeedback } from "@/lib/essay-feedback";
import type { TaskDefinition } from "@/lib/tcf-tasks";

export type CorrectionModalState = "loading" | "result" | "error";

interface CorrectionModalProps {
  open: boolean;
  state: CorrectionModalState;
  task: TaskDefinition;
  submissionId: string | null;
  originalText: string;
  feedback: EssayFeedback | null;
  feedbackLocale: AppLocale | null;
  locale: AppLocale;
  isStale: boolean;
  copy: AppCopy;
  onClose: () => void;
  onRetry: () => void;
}

type TabId = "overview" | "comparison" | "comments";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), summary, textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const RADAR_CENTER = 100;
const RADAR_RADIUS = 70;
const RADAR_ANGLES = [-90, 30, 150];
const RADAR_AXIS_COLORS = ["#7c3aed", "#0284c7", "#c026d3"];

type CorrectionModalCopy = AppCopy["workspace"]["correctionModal"];

interface LearningCriterion {
  label: string;
  score: EssayFeedback["scores"][keyof EssayFeedback["scores"]];
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

interface TextHighlight {
  start: number;
  text: string;
  title?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#039;";
    }
  });
}

function printableText(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function renderHighlightedText(
  text: string,
  highlights: TextHighlight[],
  variant: "original" | "corrected",
): ReactNode[] {
  const validHighlights = highlights
    .filter(
      (highlight) =>
        Number.isInteger(highlight.start) &&
        highlight.start >= 0 &&
        Boolean(highlight.text) &&
        text.slice(highlight.start, highlight.start + highlight.text.length) === highlight.text,
    )
    .sort((a, b) => a.start - b.start || b.text.length - a.text.length);
  if (validHighlights.length === 0) return [text];

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const [index, highlight] of validHighlights.entries()) {
    const end = highlight.start + highlight.text.length;
    // Never let an overlapping model-provided range re-label already rendered
    // text. Invalid ranges simply fall back to the detailed correction cards.
    if (highlight.start < cursor) continue;

    if (highlight.start > cursor) nodes.push(text.slice(cursor, highlight.start));
    nodes.push(
      variant === "original" ? (
        <mark
          key={`${highlight.start}-${index}`}
          title={highlight.title}
          className="rounded bg-red-500/10 px-0.5 text-inherit underline decoration-2 decoration-red-500 underline-offset-2 dark:bg-red-400/15"
        >
          {highlight.text}
        </mark>
      ) : (
        <mark
          key={`${highlight.start}-${index}`}
          className="rounded bg-emerald-500/10 px-0.5 font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
        >
          {highlight.text}
        </mark>
      ),
    );
    cursor = end;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.length > 0 ? nodes : [text];
}

function getLearningCriteria(feedback: EssayFeedback, modalCopy: CorrectionModalCopy): LearningCriterion[] {
  return [
    { label: modalCopy.contentScoreLabel, score: feedback.scores.content },
    { label: modalCopy.linguisticsScoreLabel, score: feedback.scores.linguistics },
    { label: modalCopy.vocabularyScoreLabel, score: feedback.scores.vocabulary },
  ];
}

function getOverallScore(criteria: LearningCriterion[]) {
  return Math.round(criteria.reduce((total, criterion) => total + criterion.score.score, 0) / criteria.length);
}

function getRadarPoint(score: number, index: number) {
  const angle = (RADAR_ANGLES[index] * Math.PI) / 180;
  const radius = (Math.max(0, Math.min(100, score)) / 100) * RADAR_RADIUS;
  return {
    x: RADAR_CENTER + Math.cos(angle) * radius,
    y: RADAR_CENTER + Math.sin(angle) * radius,
  };
}

function getRadarPolygon(scores: number[]) {
  return scores
    .map((score, index) => {
      const point = getRadarPoint(score, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function createPrintDocument({
  task,
  submissionId,
  originalText,
  feedback,
  locale,
  copy,
}: Pick<CorrectionModalProps, "task" | "submissionId" | "originalText" | "feedback" | "locale" | "copy">) {
  if (!feedback) return "";

  const modalCopy = copy.workspace.correctionModal;
  const criteria = getLearningCriteria(feedback, modalCopy);
  const scoreRows = criteria
    .map(
      ({ label, score }) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(score.score))}%</td><td>${printableText(score.feedback)}</td></tr>`,
    )
    .join("");
  const errorRows = feedback.errors
    .map(
      (error) =>
        `<li><strong>${printableText(error.original)}</strong> &rarr; <strong>${printableText(error.correction)}</strong><br />${printableText(error.explanation)}</li>`,
    )
    .join("");
  const suggestionRows = feedback.suggestions.map((suggestion) => `<li>${printableText(suggestion)}</li>`).join("");
  const title = modalCopy.title({ taskLabel: task.label });
  const submissionReference = submissionId
    ? ` &middot; ${escapeHtml(modalCopy.submissionId({ id: submissionId }))}`
    : "";

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { color: #171717; font-family: Arial, Helvetica, sans-serif; line-height: 1.5; margin: 40px auto; max-width: 900px; }
      h1, h2, h3 { line-height: 1.2; }
      h1 { margin-bottom: 4px; }
      h2 { border-bottom: 1px solid #d4d4d8; margin-top: 32px; padding-bottom: 6px; }
      h3 { margin-bottom: 6px; }
      .meta { color: #52525b; margin-top: 0; }
      .card { background: #f4f4f5; border-radius: 12px; margin: 16px 0; padding: 16px; }
      .columns { display: grid; gap: 20px; grid-template-columns: 1fr 1fr; }
      .text { white-space: pre-wrap; }
      blockquote { background: #eff6ff; border-left: 4px solid #2563eb; margin: 16px 0; padding: 16px; white-space: pre-wrap; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #d4d4d8; padding: 10px 0; text-align: left; vertical-align: top; }
      th { width: 26%; }
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(modalCopy.statusEvaluated)} &middot; ${escapeHtml(
      modalCopy.wordCount({
        count: countWords(originalText),
        minWords: task.minWords,
        maxWords: task.maxWords,
      }),
    )} &middot; ${escapeHtml(modalCopy.estimatedLevel({ level: feedback.cefrLevel }))}${submissionReference}</p>

    <section class="card">
      <h2>${escapeHtml(modalCopy.tabOverview)}</h2>
      <p>${escapeHtml(modalCopy.scoreDisclosure)}</p>
      <h3>${escapeHtml(modalCopy.globalPerformanceHeading)}</h3>
      <p>${escapeHtml(modalCopy.overallScore({ score: getOverallScore(criteria) }))}</p>
      <p>${escapeHtml(modalCopy.overallScoreDescription)}</p>
      <p>${printableText(feedback.wordCountNote)}</p>
      <p>${escapeHtml(modalCopy.cefrEstimateDisclosure)}</p>
      <h3>${escapeHtml(modalCopy.cefrRationaleHeading)}</h3>
      <p>${printableText(feedback.cefrRationale)}</p>
      <table>${scoreRows}</table>
    </section>

    <section>
      <h2>${escapeHtml(modalCopy.tabCompared)}</h2>
      <div class="columns">
        <div><h3>${escapeHtml(modalCopy.originalHeading)}</h3><p class="text">${printableText(originalText)}</p></div>
        <div><h3>${escapeHtml(modalCopy.correctedHeading)}</h3><p class="text">${printableText(feedback.correctedText)}</p></div>
      </div>
      <h3>${escapeHtml(modalCopy.correctionsHeading({ count: feedback.errors.length }))}</h3>
      ${errorRows ? `<ol>${errorRows}</ol>` : `<p>${escapeHtml(modalCopy.noCorrectionsNote)}</p>`}
    </section>

    <section>
      <h2>${escapeHtml(modalCopy.tabComments)}</h2>
      <h3>${escapeHtml(modalCopy.commentsHeading)}</h3>
      <p>${printableText(feedback.summary)}</p>
      ${suggestionRows ? `<h3>${escapeHtml(copy.workspace.feedback.suggestions)}</h3><ul>${suggestionRows}</ul>` : ""}
      <h3>${escapeHtml(modalCopy.modelVersionHeading)}</h3>
      <blockquote>${printableText(feedback.modelVersion)}</blockquote>
    </section>
  </body>
</html>`;
}

export function CorrectionModal({
  open,
  state,
  task,
  submissionId,
  originalText,
  feedback,
  feedbackLocale,
  locale,
  isStale,
  copy,
  onClose,
  onRetry,
}: CorrectionModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [expandedCorrectionIndexes, setExpandedCorrectionIndexes] = useState<Set<number>>(() => new Set([0]));
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    overview: null,
    comparison: null,
    comments: null,
  });
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const modalCopy = copy.workspace.correctionModal;
  const originalWordCount = countWords(originalText);
  const isWordCountInRange = feedback?.meetsWordCount ?? (
    originalWordCount >= task.minWords && originalWordCount <= task.maxWords
  );

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      // Hidden tab panels can still contain elements matching the selector
      // (notably <summary>). They are not tab stops, so including them here
      // makes the trap calculate the wrong first/last element and lets focus
      // escape from the visible footer. Match the browser's actual tab order.
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) =>
          !element.closest("[hidden]") &&
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!dialogRef.current.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const originalHighlights = (feedback?.errors ?? []).flatMap((error) =>
    typeof error.originalStart === "number"
      ? [{ start: error.originalStart, text: error.original, title: `${modalCopy.correctedHeading}: ${error.correction}` }]
      : [],
  );
  const correctedHighlights = (feedback?.errors ?? []).flatMap((error) =>
    typeof error.correctionStart === "number"
      ? [{ start: error.correctionStart, text: error.correction }]
      : [],
  );

  function handlePrint() {
    if (!feedback) return;

    const printableDocument = createPrintDocument({ task, submissionId, originalText, feedback, locale, copy });
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.opener = null;
      printWindow.addEventListener(
        "load",
        () => {
          printWindow.focus();
          printWindow.print();
        },
        { once: true },
      );
      printWindow.document.open();
      printWindow.document.write(printableDocument);
      printWindow.document.close();
      return;
    }

    // A popup blocker must not make this control print the app behind the
    // modal. Render the same correction document into a temporary, hidden
    // frame instead, then invoke that frame's native print dialog.
    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("aria-hidden", "true");
    Object.assign(printFrame.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });
    printFrame.addEventListener(
      "load",
      () => {
        const frameWindow = printFrame.contentWindow;
        if (!frameWindow) {
          printFrame.remove();
          return;
        }
        frameWindow.addEventListener("afterprint", () => printFrame.remove(), { once: true });
        frameWindow.focus();
        frameWindow.print();
      },
      { once: true },
    );
    printFrame.srcdoc = printableDocument;
    document.body.appendChild(printFrame);
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: modalCopy.tabOverview },
    { id: "comparison", label: modalCopy.tabCompared },
    { id: "comments", label: modalCopy.tabComments },
  ];
  const feedbackLanguage = feedbackLocale ?? locale;
  const learningCriteria = feedback ? getLearningCriteria(feedback, modalCopy) : [];
  const overallScore = learningCriteria.length > 0 ? getOverallScore(learningCriteria) : 0;

  function selectTab(nextTab: TabId, shouldFocus = false) {
    setActiveTab(nextTab);
    if (shouldFocus) tabRefs.current[nextTab]?.focus();
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: TabId) {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(tabs[nextIndex].id, true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 sm:p-6" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background shadow-2xl outline-none sm:h-auto sm:max-h-[92dvh] sm:w-[80vw] sm:max-w-6xl sm:rounded-2xl sm:border sm:border-black/[.1] dark:sm:border-white/[.15]"
      >
        <header className="flex-none border-b border-black/[.08] px-4 py-4 dark:border-white/[.12] sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                {copy.workspace.editor.responseLabel}
              </p>
              <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {modalCopy.title({ taskLabel: task.label })}
              </h2>
              {state === "result" && submissionId && (
                <p className="mt-1 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {modalCopy.submissionId({ id: submissionId })}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {state === "result" && feedback && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="hidden rounded-full border border-black/[.15] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06] sm:inline-flex"
                >
                  {modalCopy.downloadPdf}
                </button>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={copy.common.close}
                className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.08]"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
            {state === "result" && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                {modalCopy.statusEvaluated}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 ${
                isWordCountInRange
                  ? "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-800 dark:bg-red-400/15 dark:text-red-300"
              }`}
            >
              {modalCopy.wordCount({
                count: originalWordCount,
                minWords: task.minWords,
                maxWords: task.maxWords,
              })}
            </span>
            {state === "result" && feedback && (
              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300">
                {modalCopy.estimatedLevel({ level: feedback.cefrLevel })}
              </span>
            )}
          </div>
          {state === "result" && feedback && (
            <button
              type="button"
              onClick={handlePrint}
              className="mt-3 rounded-full border border-black/[.15] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06] sm:hidden"
            >
              {modalCopy.downloadPdf}
            </button>
          )}
        </header>

        {state === "result" && feedback ? (
          <>
            <div role="tablist" aria-label={modalCopy.title({ taskLabel: task.label })} className="flex flex-none gap-1 overflow-x-auto border-b border-black/[.08] px-4 pt-3 dark:border-white/[.12] sm:px-6">
              {tabs.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(element) => {
                      tabRefs.current[tab.id] = element;
                    }}
                    id={`${dialogId}-${tab.id}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`${dialogId}-${tab.id}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectTab(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                    className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-foreground text-foreground"
                        : "border-transparent text-zinc-500 hover:text-foreground dark:text-zinc-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <section
                id={`${dialogId}-overview-panel`}
                role="tabpanel"
                aria-labelledby={`${dialogId}-overview-tab`}
                hidden={activeTab !== "overview"}
                className="space-y-5 py-6"
              >
                  {(isStale || (feedbackLocale && feedbackLocale !== locale)) && (
                    <div className="space-y-2">
                      {feedbackLocale && feedbackLocale !== locale && (
                        <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-300">
                          {copy.workspace.feedback.generatedInOtherLanguage({
                            generatedLanguage: APP_LOCALE_LABELS[feedbackLocale],
                            selectedLanguage: APP_LOCALE_LABELS[locale],
                          })}
                        </p>
                      )}
                      {isStale && (
                        <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-300">
                          {copy.workspace.feedback.stale}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-black/[.08] bg-black/[.025] p-4 dark:border-white/[.12] dark:bg-white/[.04] sm:p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-semibold">{modalCopy.estimatedLevel({ level: feedback.cefrLevel })}</h3>
                      <p
                        lang={feedbackLanguage}
                        className={`text-sm ${
                          feedback.meetsWordCount
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {feedback.wordCountNote}
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                      {modalCopy.cefrEstimateDisclosure}
                    </p>
                    <div
                      role="list"
                      aria-label={modalCopy.estimatedLevel({ level: feedback.cefrLevel })}
                      className="mt-4 grid grid-cols-6 gap-1 text-center text-xs"
                    >
                      {CEFR_LEVELS.map((level) => (
                        <span
                          key={level}
                          role="listitem"
                          aria-current={level === feedback.cefrLevel ? "true" : undefined}
                          className={`rounded-md px-1.5 py-2 font-medium ${
                            level === feedback.cefrLevel
                              ? "bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950"
                              : "bg-black/[.05] text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400"
                          }`}
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-black/[.08] pt-4 dark:border-white/[.12]">
                      <h4 className="text-sm font-medium">{modalCopy.cefrRationaleHeading}</h4>
                      <p lang={feedbackLanguage} className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {feedback.cefrRationale}
                      </p>
                    </div>
                  </div>

                  <figure className="rounded-2xl border border-violet-500/20 bg-violet-500/[.035] p-4 dark:border-violet-400/25 dark:bg-violet-400/[.06] sm:p-5">
                    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
                      <div className="min-w-0">
                        <h3 id={`${dialogId}-overall-score-heading`} className="font-semibold">
                          {modalCopy.globalPerformanceHeading}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{modalCopy.scoreDisclosure}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-violet-800 dark:text-violet-200">
                          {modalCopy.overallScore({ score: overallScore })}
                        </p>
                        <p
                          id={`${dialogId}-overall-score-description`}
                          className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300"
                        >
                          {modalCopy.overallScoreDescription}
                        </p>
                        <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-1">
                          {learningCriteria.map((criterion, index) => (
                            <li key={criterion.label} className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: RADAR_AXIS_COLORS[index] }}
                                />
                                <span className="truncate">{criterion.label}</span>
                              </span>
                              <strong className="shrink-0 text-zinc-700 dark:text-zinc-200">{criterion.score.score}%</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={modalCopy.overallScore({ score: overallScore })}
                        aria-describedby={`${dialogId}-overall-score-description`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={overallScore}
                        className="mx-auto w-full max-w-[13rem] text-zinc-300 dark:text-zinc-700"
                      >
                        <svg viewBox="0 0 200 200" className="h-auto w-full" aria-hidden="true">
                          {[25, 50, 75, 100].map((level) => (
                            <polygon
                              key={level}
                              points={getRadarPolygon([level, level, level])}
                              fill="none"
                              stroke="currentColor"
                              strokeDasharray={level === 100 ? undefined : "3 3"}
                              strokeWidth="1"
                            />
                          ))}
                          {RADAR_ANGLES.map((_, index) => {
                            const point = getRadarPoint(100, index);
                            return (
                              <line
                                key={index}
                                x1={RADAR_CENTER}
                                y1={RADAR_CENTER}
                                x2={point.x}
                                y2={point.y}
                                stroke="currentColor"
                                strokeWidth="1"
                              />
                            );
                          })}
                          <polygon
                            points={getRadarPolygon(learningCriteria.map((criterion) => criterion.score.score))}
                            fill="#7c3aed"
                            fillOpacity="0.18"
                            stroke="#7c3aed"
                            strokeWidth="2"
                          />
                          {learningCriteria.map((criterion, index) => {
                            const point = getRadarPoint(criterion.score.score, index);
                            return <circle key={criterion.label} cx={point.x} cy={point.y} r="4" fill={RADAR_AXIS_COLORS[index]} />;
                          })}
                          <text
                            x={RADAR_CENTER}
                            y={RADAR_CENTER + 8}
                            fill="currentColor"
                            textAnchor="middle"
                            className="fill-zinc-900 text-[26px] font-semibold dark:fill-white"
                          >
                            {overallScore}%
                          </text>
                        </svg>
                      </div>
                    </div>
                  </figure>

                  <div className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
                    <h3 className="font-semibold">{modalCopy.tabOverview}</h3>
                    <div className="mt-4 space-y-5">
                      {learningCriteria.map((criterion) => (
                        <div key={criterion.label}>
                          <div className="flex items-baseline justify-between gap-4">
                            <h4 className="text-sm font-medium">{criterion.label}</h4>
                            <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{criterion.score.score}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={criterion.label}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={criterion.score.score}
                            className="mt-2 h-2 overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.12]"
                          >
                            <div className="h-full rounded-full bg-violet-600 dark:bg-violet-400" style={{ width: `${criterion.score.score}%` }} />
                          </div>
                          <p lang={feedbackLanguage} className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                            {criterion.score.feedback}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
              </section>

              <section
                id={`${dialogId}-comparison-panel`}
                role="tabpanel"
                aria-labelledby={`${dialogId}-comparison-tab`}
                hidden={activeTab !== "comparison"}
                className="space-y-5 py-6"
              >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
                      <h3 className="font-semibold">{modalCopy.originalHeading}</h3>
                      <p lang="fr" className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                        {renderHighlightedText(originalText, originalHighlights, "original")}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.035] p-4 dark:border-emerald-400/25 dark:bg-emerald-400/[.06] sm:p-5">
                      <h3 className="font-semibold">{modalCopy.correctedHeading}</h3>
                      <p lang="fr" className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                        {renderHighlightedText(feedback.correctedText, correctedHighlights, "corrected")}
                      </p>
                    </article>
                  </div>

                  <div className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
                    <h3 className="font-semibold">{modalCopy.correctionsHeading({ count: feedback.errors.length })}</h3>
                    {feedback.errors.length > 0 ? (
                      <ol className="mt-4 space-y-3">
                        {feedback.errors.map((error, index) => (
                          <li key={`${error.original}-${index}`} className="text-sm">
                            <details
                              open={expandedCorrectionIndexes.has(index)}
                              onToggle={(event) => {
                                const isOpen = event.currentTarget.open;
                                setExpandedCorrectionIndexes((indexes) => {
                                  const nextIndexes = new Set(indexes);
                                  if (isOpen) nextIndexes.add(index);
                                  else nextIndexes.delete(index);
                                  return nextIndexes;
                                });
                              }}
                              className="group overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.12]"
                            >
                              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 outline-none transition-colors hover:bg-black/[.025] focus-visible:bg-black/[.04] focus-visible:ring-2 focus-visible:ring-violet-600/60 dark:hover:bg-white/[.04] dark:focus-visible:bg-white/[.06] [&::-webkit-details-marker]:hidden">
                                <span className="min-w-0">
                                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      {modalCopy.errorLabel}
                                    </span>
                                    <span lang="fr" className="text-red-700 line-through decoration-red-500 dark:text-red-300">
                                      {error.original}
                                    </span>
                                    <span aria-hidden="true">→</span>
                                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      {modalCopy.correctionLabel}
                                    </span>
                                    <strong lang="fr" className="text-emerald-700 dark:text-emerald-300">
                                      {error.correction}
                                    </strong>
                                    <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-zinc-600 dark:bg-white/[.1] dark:text-zinc-300">
                                      {copy.workspace.feedback.errorCategories[error.category]}
                                    </span>
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                                  {modalCopy.toggleNote}
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    className="h-4 w-4 transition-transform group-open:rotate-180"
                                    aria-hidden="true"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 7 5 5 5-5" />
                                  </svg>
                                </span>
                              </summary>
                              <div className="border-t border-black/[.08] px-3 py-3 dark:border-white/[.12]">
                                <p lang={feedbackLanguage} className="leading-6 text-zinc-600 dark:text-zinc-300">
                                  <span className="font-medium text-foreground">{modalCopy.noteLabel}: </span>
                                  {error.explanation}
                                </p>
                              </div>
                            </details>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{modalCopy.noCorrectionsNote}</p>
                    )}
                  </div>
              </section>

              <section
                id={`${dialogId}-comments-panel`}
                role="tabpanel"
                aria-labelledby={`${dialogId}-comments-tab`}
                hidden={activeTab !== "comments"}
                className="space-y-5 py-6"
              >
                  <div className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
                    <h3 className="font-semibold">{modalCopy.commentsHeading}</h3>
                    <p lang={feedbackLanguage} className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                      {feedback.summary}
                    </p>
                    {feedback.suggestions.length > 0 && (
                      <div className="mt-5 border-t border-black/[.08] pt-5 dark:border-white/[.12]">
                        <h4 className="font-medium">{copy.workspace.feedback.suggestions}</h4>
                        <ul lang={feedbackLanguage} className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                          {feedback.suggestions.map((suggestion, index) => (
                            <li key={`${suggestion}-${index}`}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <blockquote className="rounded-2xl border border-violet-500/20 bg-violet-500/[.055] p-4 dark:border-violet-400/25 dark:bg-violet-400/[.09] sm:p-5">
                    <h3 className="font-semibold">{modalCopy.modelVersionHeading}</h3>
                    <p lang="fr" className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-800 dark:text-zinc-100">
                      {feedback.modelVersion}
                    </p>
                  </blockquote>
              </section>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-10">
            {state === "loading" ? (
              <div role="status" aria-live="polite" className="max-w-sm text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400" aria-hidden="true" />
                <p className="mt-4 font-medium">{modalCopy.loading}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{copy.workspace.editor.correctingStatus}</p>
              </div>
            ) : (
              <div role="alert" className="max-w-sm text-center">
                <p className="font-medium">{copy.workspace.editor.genericCorrectionError}</p>
              </div>
            )}
          </div>
        )}

        <footer className="flex flex-none flex-wrap items-center justify-end gap-3 border-t border-black/[.08] px-4 py-4 dark:border-white/[.12] sm:px-6">
          <div className="flex items-center gap-3">
            {state === "error" && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {modalCopy.tryAgain}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              {copy.common.close}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
