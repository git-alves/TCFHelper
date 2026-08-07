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
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

function getCefrProgress(level: EssayFeedback["cefrLevel"]) {
  const index = CEFR_LEVELS.indexOf(level);
  return index < 0 ? 0 : Math.round((index / (CEFR_LEVELS.length - 1)) * 100);
}

function createPrintDocument({
  task,
  originalText,
  feedback,
  locale,
  copy,
}: Pick<CorrectionModalProps, "task" | "originalText" | "feedback" | "locale" | "copy">) {
  if (!feedback) return "";

  const modalCopy = copy.workspace.correctionModal;
  const scoreRows = [
    { label: modalCopy.contentScoreLabel, score: feedback.scores.content },
    { label: modalCopy.linguisticsScoreLabel, score: feedback.scores.linguistics },
    { label: modalCopy.vocabularyScoreLabel, score: feedback.scores.vocabulary },
  ]
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
    )} &middot; ${escapeHtml(modalCopy.estimatedLevel({ level: feedback.cefrLevel }))}</p>

    <section class="card">
      <h2>${escapeHtml(modalCopy.tabOverview)}</h2>
      <p>${escapeHtml(modalCopy.scoreDisclosure)}</p>
      <p>${printableText(feedback.wordCountNote)}</p>
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
  const [isMarkedRead, setIsMarkedRead] = useState(false);
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

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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

    const printableDocument = createPrintDocument({ task, originalText, feedback, locale, copy });
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
                    <div
                      role="progressbar"
                      aria-label={modalCopy.estimatedLevel({ level: feedback.cefrLevel })}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={getCefrProgress(feedback.cefrLevel)}
                      className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-500/10 dark:bg-violet-400/15"
                    >
                      <div
                        className="h-full rounded-full bg-violet-600 dark:bg-violet-400"
                        style={{ width: `${getCefrProgress(feedback.cefrLevel)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      {CEFR_LEVELS.map((level) => (
                        <span key={level} className={level === feedback.cefrLevel ? "font-semibold text-foreground" : undefined}>
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
                    <h3 className="font-semibold">{modalCopy.tabOverview}</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{modalCopy.scoreDisclosure}</p>
                    <div className="mt-4 space-y-5">
                      {[
                        { label: modalCopy.contentScoreLabel, score: feedback.scores.content },
                        { label: modalCopy.linguisticsScoreLabel, score: feedback.scores.linguistics },
                        { label: modalCopy.vocabularyScoreLabel, score: feedback.scores.vocabulary },
                      ].map((criterion) => (
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
                          <li key={`${error.original}-${index}`} className="rounded-xl border border-black/[.08] p-3 text-sm dark:border-white/[.12]">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span lang="fr" className="text-red-700 line-through decoration-red-500 dark:text-red-300">
                                {error.original}
                              </span>
                              <span aria-hidden="true">→</span>
                              <strong lang="fr" className="text-emerald-700 dark:text-emerald-300">
                                {error.correction}
                              </strong>
                              <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-zinc-600 dark:bg-white/[.1] dark:text-zinc-300">
                                {copy.workspace.feedback.errorCategories[error.category]}
                              </span>
                            </div>
                            <p lang={feedbackLanguage} className="mt-2 leading-6 text-zinc-600 dark:text-zinc-300">
                              {error.explanation}
                            </p>
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

        <footer className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-black/[.08] px-4 py-4 dark:border-white/[.12] sm:px-6">
          {state === "result" && feedback ? (
            <button
              type="button"
              onClick={() => setIsMarkedRead(true)}
              disabled={isMarkedRead}
              aria-pressed={isMarkedRead}
              className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-default disabled:opacity-70 dark:border-white/[.2] dark:hover:bg-white/[.06]"
            >
              {isMarkedRead ? modalCopy.markedAsRead : modalCopy.markAsRead}
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="ml-auto flex items-center gap-3">
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
