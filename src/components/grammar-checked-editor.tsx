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

export type LanguageCheckStatus = "idle" | "checking" | "error";

/** The subset of `copy.workspace.grammarCheck` this component renders
 * itself -- the toggle button and its "Checking…"/"unavailable" status text
 * live in the caller instead (see WritingWorkspace), so they stay visually
 * grouped with its other action buttons rather than in a separate row with
 * their own color scheme. */
export interface GrammarCheckCopy {
  applyButton: string;
  closeButtonAriaLabel: string;
  noReplacementHint: string;
  issuesHeading: (values: { count: number }) => string;
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
  /** Mirrors the internal check status out to the caller, which owns the
   * toggle button and renders "Checking…"/error text next to it. */
  onStatusChange?: (status: LanguageCheckStatus) => void;
}

type CheckStatus = LanguageCheckStatus;

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
          // `abort()` can't un-resolve a fetch promise that had already
          // settled before it was called -- a real race for a fast typist
          // if a response lands just as they type again. Without this
          // check, a superseded response could still overwrite `matches`
          // with offsets into text that no longer exists.
          if (controller.signal.aborted) return;
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
 *
 * Both the textarea and the overlay use `scrollbar-gutter: stable`. A
 * native scrollbar takes width away from the textarea's content box only
 * once it's actually showing one; the overlay (`overflow-hidden`, no
 * scrollbar of its own) would otherwise stay full-width the whole time.
 * Once an essay grows past the visible rows, that width difference would
 * make the two wrap their (identical) text differently, so an underline
 * could land on the wrong line even with scrollTop perfectly synced.
 * Reserving the gutter unconditionally on both keeps their usable width
 * identical whether or not the content currently overflows.
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
  onStatusChange,
}: GrammarCheckedEditorProps) {
  const { matches, status } = useLanguageCheck(value, enabled && !disabled);
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);
  const segments = useMemo(() => buildLanguageCheckSegments(value, matches), [value, matches]);
  // The only matches actually safe to show or apply: `buildLanguageCheckSegments`
  // already dropped whatever was out-of-range for the current `value` (a
  // debounced response can legitimately resolve just after `AbortController.abort()`
  // is called, if the fetch promise had already settled before the abort took
  // effect -- the abort can't un-resolve an already-resolved promise) or
  // overlapping another match. Deriving from `segments` instead of iterating
  // `matches` directly means the issues list below can never expose an Apply
  // button for a match `applyLanguageCheckReplacement` would slice incorrectly.
  const acceptedMatchIndexes = useMemo(
    () =>
      segments
        .map((segment) => segment.matchIndex)
        .filter((matchIndex): matchIndex is number => matchIndex !== null),
    [segments],
  );

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

  // The overlay's height cannot be left to `inset-0` inside its `relative`
  // container: that container has no explicit height of its own (it sizes
  // to fit the textarea, its only in-flow child), and a block-level
  // "auto" height is a shrink-to-fit content height, not a stretch target.
  // An absolutely-positioned child can't resolve `top: 0; bottom: 0`
  // against that -- there's a circular dependency, since the container's
  // height would have to come from a child that's out of flow -- so
  // browsers fall back to sizing the overlay from its own content instead
  // of stretching it to match, drifting a few pixels taller than the real
  // textarea. Measuring the textarea directly and applying that height to
  // the overlay imperatively sidesteps the ambiguity entirely, and a
  // ResizeObserver keeps it correct if the learner drags the textarea's own
  // resize handle. (Width has no equivalent problem: an ordinary block's
  // "auto" width already fills its container, so `w-full` on the overlay
  // matches without any of this.)
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) return;

    const syncHeight = () => {
      overlay.style.height = `${textarea.offsetHeight}px`;
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

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

  // Shared between the mouse-oriented popup and the always-in-the-tab-order
  // issues list below, so the two accessible/inaccessible surfaces never
  // drift out of sync with each other.
  function renderReplacementActions(match: LanguageCheckMatch, matchIndex: number) {
    if (match.replacements.length === 0) {
      return <p className="mt-2 text-zinc-500 dark:text-zinc-400">{copy.noReplacementHint}</p>;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {match.replacements.map((replacement, index) => (
          <button
            key={`${replacement}-${index}`}
            type="button"
            onClick={() => handleApply(matchIndex, replacement)}
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
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="relative">
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 w-full overflow-hidden rounded-xl border border-transparent px-4 py-3 whitespace-pre-wrap break-words text-transparent [scrollbar-gutter:stable]"
        >
          {segments.map((segment, segmentIndex) => {
            if (segment.matchIndex === null) {
              return <span key={segmentIndex}>{segment.text}</span>;
            }

            return (
              // Decorative only -- a mouse-hover/click shortcut to the same
              // popup the accessible issues list below always exposes.
              // Never a tab stop or in the accessibility tree: it lives
              // inside the `aria-hidden` overlay (see above), so it must not
              // be focusable itself, and it has no keyboard handling.
              <mark
                key={segmentIndex}
                className="pointer-events-auto cursor-pointer rounded-[1px] bg-transparent text-transparent underline decoration-red-500 decoration-2 decoration-wavy underline-offset-2 dark:decoration-red-400"
                onClick={(event) => openPopupForMatch(segment.matchIndex as number, event.currentTarget)}
                onMouseEnter={(event) => scheduleOpen(segment.matchIndex as number, event.currentTarget)}
                onMouseLeave={scheduleClose}
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
          className={`${className} relative z-0 [scrollbar-gutter:stable]`}
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
            {renderReplacementActions(activeMatch, activeMatchIndex as number)}
          </div>
        )}
      </div>

      {/* The overlay's `<mark>`s are mouse-only decoration living inside an
          `aria-hidden` ancestor (see above) -- they are never a tab stop and
          have no keyboard handling, so a focusable "button" there would be
          invisible to assistive tech while still eating a Tab press. This
          list is the real, always-reachable equivalent: ordinary buttons,
          in normal document order, right after the editor. */}
      {enabled && acceptedMatchIndexes.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-black/[.12] p-3 text-sm dark:border-white/[.15]">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">
            {copy.issuesHeading({ count: acceptedMatchIndexes.length })}
          </p>
          <ul className="flex flex-col gap-2">
            {acceptedMatchIndexes.map((matchIndex) => {
              const match = matches[matchIndex];
              return (
                <li
                  key={matchIndex}
                  className="rounded-lg border border-black/[.1] p-2 dark:border-white/[.15]"
                >
                  <p>{match.message}</p>
                  {renderReplacementActions(match, matchIndex)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
