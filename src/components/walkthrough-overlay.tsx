"use client";

import { useEffect, useId, useRef } from "react";
import type { AppCopy } from "@/lib/app-copy";
import { useWalkthroughTargetRect } from "@/lib/use-walkthrough-target-rect";
import { computeTooltipPosition, TOOLTIP_WIDTH, type TooltipPlacement } from "@/lib/walkthrough-position";

export interface WalkthroughStepContent {
  // Matches the data-walkthrough="<id>" attribute on the element this step
  // points at.
  id: string;
  title: string;
  body: string;
  placement?: TooltipPlacement;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface WalkthroughOverlayProps {
  open: boolean;
  steps: WalkthroughStepContent[];
  stepIndex: number;
  // Only the walkthrough copy slice, not the whole AppCopy -- resolved once
  // by whichever client component mounts this (the same division of
  // responsibility CorrectionModal uses: useAppCopy() near the top of the
  // tree, plain props from there down).
  copy: AppCopy["walkthrough"];
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

/**
 * Renders nothing until the target element has actually been measured
 * (server-rendered markup and the very first client paint both have no
 * layout to measure yet) -- that's deliberate: it avoids a flash of a
 * wrongly-positioned tooltip rather than trying to guess a position ahead of
 * real layout.
 */
export function WalkthroughOverlay({
  open,
  steps,
  stepIndex,
  copy,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: WalkthroughOverlayProps) {
  const step = steps[stepIndex] ?? null;
  const targetRect = useWalkthroughTargetRect(open ? (step?.id ?? null) : null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const bodyId = `${dialogId}-body`;

  // A stable boolean, not targetRect itself, so the effects below don't
  // re-run on every resize-triggered remeasurement -- only on the dialog
  // actually appearing or disappearing.
  const isVisible = open && step !== null && targetRect !== null;

  // Focus trap + restore, matching ConfirmDialog/Modal: captures whatever
  // had focus right before the dialog appeared and gives it back on close,
  // and keeps Tab cycling inside the dialog the whole time -- aria-modal
  // implies both, and neither happens for free.
  useEffect(() => {
    if (!isVisible) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
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
      const active = document.activeElement;

      if (!dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isVisible, onSkip]);

  // Separate from the effect above: this fires on every step change, not
  // just the dialog's open/close transitions, so it can't be the same
  // effect without also re-capturing previouslyFocusedRef from inside the
  // dialog itself on step 2 onward.
  useEffect(() => {
    if (isVisible) nextButtonRef.current?.focus();
  }, [isVisible, stepIndex]);

  if (!isVisible || !step || !targetRect) return null;

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const tooltip = computeTooltipPosition(targetRect, viewport, step.placement ?? "bottom");
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  return (
    // Highlighting the sole z-[70]+ layer in the app is deliberate: a tour
    // step should never coexist with a real dialog (ConfirmDialog/Modal at
    // z-50, CorrectionModal at z-[60]) underneath it -- whatever starts the
    // walkthrough is responsible for not doing so while one of those is open.
    <div className="fixed inset-0 z-[70]" onClick={onSkip}>
      {/* A single element with an oversized box-shadow, rather than four
          separate dimming panels, is the simplest way to cut a "spotlight"
          out of a full-page backdrop -- see the walkthrough-highlight/
          walkthrough-pulse rules in globals.css for the animated ring that
          makes the target read as "look/click here". */}
      <div
        aria-hidden="true"
        className="walkthrough-highlight absolute rounded-lg transition-[top,left,width,height] duration-200"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(event) => event.stopPropagation()}
        className="absolute rounded-2xl border border-black/[.1] bg-background p-5 shadow-2xl dark:border-white/[.15]"
        style={{ top: tooltip.top, left: tooltip.left, width: TOOLTIP_WIDTH, maxWidth: "calc(100vw - 2rem)" }}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {copy.stepProgress({ step: stepIndex + 1, total: steps.length })}
        </p>
        <h2 id={titleId} className="mt-1 text-base font-semibold">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {step.body}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-foreground dark:text-zinc-400"
          >
            {copy.skip}
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {copy.back}
              </button>
            )}
            <button
              ref={nextButtonRef}
              type="button"
              onClick={isLastStep ? onFinish : onNext}
              className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              {isLastStep ? copy.finish : copy.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
