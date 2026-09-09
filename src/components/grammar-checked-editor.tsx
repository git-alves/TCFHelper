"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyLanguageCheckReplacement } from "@/lib/apply-correction";
import { buildLanguageCheckSegments } from "@/lib/language-check-segments";
import type { LanguageCheckMatch } from "@/lib/language-tool";

// Debounce sits in the middle of the requested 500-800ms window: long
// enough that a fast typist doesn't fire a request per keystroke, short
// enough that the underlines still feel "live".
const LANGUAGE_CHECK_DEBOUNCE_MS = 650;

// How long a mark or the popup itself can be un-hovered before the popup
// closes -- long enough to move the mouse from the underlined word to the
// popup's Apply button without it disappearing first.
const POPUP_CLOSE_DELAY_MS = 200;
const POPUP_OPEN_DELAY_MS = 120;
const POPUP_WIDTH_PX = 288;

export interface GrammarCheckCopy {
  toggleLabel: string;
  toggleAriaLabel: (values: { enabled: boolean }) => string;
  statusOn: string;
  statusOff: string;
  checking: string;
  unavailable: string;
  applyButton: string;
  closeButtonAriaLabel: string;
  noReplacementHint: string;
}

interface GrammarCheckedEditorProps {
  id: string;
  dataWalkthrough?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  maxLength: number;
  disabled: boolean;
  ariaDescribedBy?: string;
  className: string;
  copy: GrammarCheckCopy;
  enabled: boolean;
  onToggleEnabled: () => void;
}

type CheckStatus = "idle" | "checking" | "error";

/**
 * Debounces calls to `/api/language-check` while `text` changes, cancelling
 * any in-flight request that a newer keystroke has made obsolete.
 *
 * Matches are cleared the instant `text` changes -- before the debounce
 * timer even starts -- rather than waiting for a fresh response. A match's
 * `offset`/`length` describe a specific earlier version of the text; keeping
 * it displayed for another 650ms would underline the wrong span the moment
 * the learner types anything before it.
 */
function useLanguageCheck(text: string, enabled: boolean) {
  const [matches, setMatches] = useState<LanguageCheckMatch[]>([]);
  const [status, setStatus] = useState<CheckStatus>("idle");

  // Reacting to a prop/state change by adjusting state is meant to happen
  // during render, not inside an effect (see
  // https://react.dev/learn/you-might-not-need-an-effect) -- this is what
  // lets stale matches disappear the instant `text` changes, a full render
  // before the debounced request effect below even starts. The "previous
  // value" is itself state (not a ref) per
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders,
  // since refs may not be read during render.
  const key = `${enabled}:${text}`;
  const [previousKey, setPreviousKey] = useState(key);
  if (previousKey !== key) {
    setPreviousKey(key);
    if (matches.length > 0) setMatches([]);
    const nextStatus: CheckStatus = enabled && text.trim() ? "checking" : "idle";
    if (status !== nextStatus) setStatus(nextStatus);
  }

  useEffect(() => {
    if (!enabled || !text.trim()) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/language-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Language check failed (${response.status})`);
          return response.json() as Promise<{ errors?: LanguageCheckMatch[] }>;
        })
        .then((payload) => {
          setMatches(Array.isArray(payload.errors) ? payload.errors : []);
          setStatus("idle");
        })
        .catch(() => {
          // An aborted request is a superseded check, not a failure -- the
          // next effect run already owns reporting status for its own text.
          if (controller.signal.aborted) return;
          setMatches([]);
          setStatus("error");
        });
    }, LANGUAGE_CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, enabled]);

  return { matches, status };
}

/**
 * A drop-in replacement for a plain `<textarea>` that underlines spelling,
 * grammar, and (where LanguageTool finds one) missing-word issues while the
 * learner types, with a click/hover popup offering LanguageTool's own
 * suggested fix.
 *
 * Implementation note (the "mirror" technique): a `<textarea>` cannot
 * contain `<mark>` children, so real inline underlines aren't possible
 * inside it directly. Instead, an invisible copy of the text is rendered in
 * a same-font, same-padding overlay `<div>` stacked exactly on top of the
 * textarea. Everywhere except the flagged spans, that overlay is fully
 * transparent (text and background) and ignores pointer events, so it's
 * invisible and typing/clicking passes straight through to the real
 * textarea underneath; only the flagged `<mark>` spans opt back into
 * pointer events, so they alone are clickable/hoverable, and only their
 * red underline decoration is visible, exactly aligned over the real text.
 */
export function GrammarCheckedEditor({
  id,
  dataWalkthrough,
  value,
  onChange,
  placeholder,
  rows,
  maxLength,
  disabled,
  ariaDescribedBy,
  className,
  copy,
  enabled,
  onToggleEnabled,
}: GrammarCheckedEditorProps) {
  const { matches, status } = useLanguageCheck(value, enabled && !disabled);
  const segments = useMemo(() => buildLanguageCheckSegments(value, matches), [value, matches]);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pendingCursorOffsetRef = useRef<number | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);

  // Restores the caret after "Apply" swaps `value` for a new string of a
  // different length -- otherwise the browser would leave it wherever the
  // numeric selectionStart now falls, which is rarely where the edit was.
  useLayoutEffect(() => {
    if (pendingCursorOffsetRef.current === null) return;
    const offset = pendingCursorOffsetRef.current;
    pendingCursorOffsetRef.current = null;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(offset, offset);
  }, [value]);

  // The overlay must track the textarea's scroll position, not just its
  // content. `onScroll` below covers a learner dragging the scrollbar or
  // using the wheel, but typing past the visible rows scrolls the textarea
  // by the browser following the caret -- a content change, not a user
  // scroll gesture. Re-syncing here, after every commit that could have
  // moved the caret (a new `value`, or the selection restored above), means
  // the underline overlay never has to depend on that also happening to
  // dispatch its own native `scroll` event.
  useLayoutEffect(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [value]);

  // Any edit invalidates whatever the popup was anchored to -- adjusted
  // during render (see the note on useLanguageCheck above), not in an
  // effect, so the popup never repaints even once at a stale position.
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    if (activeMatchIndex !== null) setActiveMatchIndex(null);
    if (popupPosition !== null) setPopupPosition(null);
  }

  useEffect(
    () => () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    },
    [],
  );

  const handleScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const clearPopupTimer = useCallback(() => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
  }, []);

  const openPopupForMatch = useCallback(
    (matchIndex: number, anchor: HTMLElement) => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const rawLeft = anchorRect.left - containerRect.left;

      setActiveMatchIndex(matchIndex);
      setPopupPosition({
        top: anchorRect.bottom - containerRect.top + 4,
        left: Math.min(Math.max(0, rawLeft), Math.max(0, containerRect.width - POPUP_WIDTH_PX)),
      });
    },
    [],
  );

  const scheduleOpen = useCallback(
    (matchIndex: number, anchor: HTMLElement) => {
      clearPopupTimer();
      popupTimerRef.current = setTimeout(() => openPopupForMatch(matchIndex, anchor), POPUP_OPEN_DELAY_MS);
    },
    [clearPopupTimer, openPopupForMatch],
  );

  const closePopup = useCallback(() => {
    setActiveMatchIndex(null);
    setPopupPosition(null);
  }, []);

  const scheduleClose = useCallback(() => {
    clearPopupTimer();
    popupTimerRef.current = setTimeout(closePopup, POPUP_CLOSE_DELAY_MS);
  }, [clearPopupTimer, closePopup]);

  const handleApply = useCallback(
    (matchIndex: number, replacement: string) => {
      const match = matches[matchIndex];
      if (!match) return;
      const applied = applyLanguageCheckReplacement(value, match.offset, match.length, replacement);
      pendingCursorOffsetRef.current = applied.cursorOffset;
      closePopup();
      onChange(applied.text);
    },
    [matches, value, onChange, closePopup],
  );

  useEffect(() => {
    if (activeMatchIndex === null) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || overlayRef.current?.contains(target)) return;
      closePopup();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePopup();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMatchIndex, closePopup]);

  const activeMatch = activeMatchIndex !== null ? matches[activeMatchIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
        {enabled && status === "checking" && (
          <span aria-live="polite" className="text-zinc-500 dark:text-zinc-400">
            {copy.checking}
          </span>
        )}
        {enabled && status === "error" && (
          <span role="alert" className="text-red-600 dark:text-red-400">
            {copy.unavailable}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={copy.toggleAriaLabel({ enabled })}
          onClick={onToggleEnabled}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${
            enabled
              ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:border-violet-400 dark:text-violet-300"
              : "border-black/[.15] text-zinc-600 hover:bg-black/[.04] dark:border-white/[.2] dark:text-zinc-300 dark:hover:bg-white/[.06]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${enabled ? "bg-violet-600 dark:bg-violet-400" : "bg-zinc-400 dark:bg-zinc-500"}`}
          />
          {copy.toggleLabel}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {enabled ? copy.statusOn : copy.statusOff}
          </span>
        </button>
      </div>

      <div ref={containerRef} className="relative">
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 min-h-72 w-full overflow-hidden rounded-xl border border-transparent px-4 py-3 whitespace-pre-wrap break-words text-transparent"
        >
          {segments.map((segment, segmentIndex) => {
            if (segment.matchIndex === null) {
              return <span key={segmentIndex}>{segment.text}</span>;
            }

            const match = matches[segment.matchIndex];
            return (
              <mark
                key={segmentIndex}
                tabIndex={0}
                role="button"
                aria-label={match?.message}
                className="pointer-events-auto cursor-pointer rounded-[1px] bg-transparent text-transparent underline decoration-red-500 decoration-2 decoration-wavy underline-offset-2 dark:decoration-red-400"
                onClick={(event) => openPopupForMatch(segment.matchIndex as number, event.currentTarget)}
                onMouseEnter={(event) => scheduleOpen(segment.matchIndex as number, event.currentTarget)}
                onMouseLeave={scheduleClose}
                onFocus={(event) => openPopupForMatch(segment.matchIndex as number, event.currentTarget)}
                onBlur={scheduleClose}
              >
                {segment.text}
              </mark>
            );
          })}
        </div>

        <textarea
          ref={textareaRef}
          id={id}
          data-walkthrough={dataWalkthrough}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          lang="fr"
          spellCheck={false}
          className={`${className} relative z-0`}
        />

        {activeMatch && popupPosition && (
          <div
            ref={popupRef}
            role="dialog"
            aria-label={activeMatch.message}
            onMouseEnter={clearPopupTimer}
            onMouseLeave={scheduleClose}
            style={{ top: popupPosition.top, left: popupPosition.left, width: POPUP_WIDTH_PX }}
            className="absolute z-20 rounded-lg border border-black/[.15] bg-background p-3 text-sm shadow-lg dark:border-white/[.25]"
          >
            <button
              type="button"
              aria-label={copy.closeButtonAriaLabel}
              onClick={closePopup}
              className="absolute top-1.5 right-1.5 rounded-full p-1 text-zinc-500 hover:bg-black/[.06] dark:text-zinc-400 dark:hover:bg-white/[.1]"
            >
              <span aria-hidden="true">×</span>
            </button>
            <p className="pr-5 font-medium">{activeMatch.message}</p>
            {activeMatch.replacements.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeMatch.replacements.map((replacement, index) => (
                  <button
                    key={`${replacement}-${index}`}
                    type="button"
                    onClick={() => handleApply(activeMatchIndex as number, replacement)}
                    className={
                      index === 0
                        ? "rounded-full bg-foreground px-3 py-1 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                        : "rounded-full border border-black/[.15] px-3 py-1 transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                    }
                  >
                    {index === 0 ? `${copy.applyButton}: ` : ""}
                    {replacement || "∅"}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">{copy.noReplacementHint}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
