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
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const bodyId = `${dialogId}-body`;

  useEffect(() => {
    if (open && targetRect) nextButtonRef.current?.focus();
  }, [open, stepIndex, targetRect]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onSkip]);

  if (!open || !step || !targetRect) return null;

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
          out of a full-page backdrop. */}
      <div
        aria-hidden="true"
        className="absolute rounded-lg transition-[top,left,width,height] duration-200"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
        }}
      />
      <div
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
