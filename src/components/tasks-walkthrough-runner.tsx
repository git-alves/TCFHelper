"use client";

import { useState } from "react";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";

interface TasksWalkthroughRunnerProps {
  // A plain boolean, computed server-side from the signed-in learner's
  // walkthroughCompletedVersion -- never the full AppCopy or a richer object
  // crossing the server/client boundary here (see the Dashboard RSC outage).
  shouldAutoStart: boolean;
}

/**
 * Owns both the "Take a tour" manual re-trigger and the tour itself for the
 * /tasks workspace, so a single mount point carries the whole feature for
 * this page. Skipping or finishing both record the current walkthrough
 * version -- same meaning either way, see /api/walkthrough/dismiss.
 */
export function TasksWalkthroughRunner({ shouldAutoStart }: TasksWalkthroughRunnerProps) {
  const copy = useAppCopy();
  // Seeded from the prop rather than set in an effect after mount: it's a
  // stable, server-computed value for this page load, so there's no
  // external system to synchronize with here, just an initial value.
  const [isOpen, setIsOpen] = useState(shouldAutoStart);
  const [stepIndex, setStepIndex] = useState(0);

  const steps: WalkthroughStepContent[] = [
    { id: "task-picker", title: copy.walkthrough.taskPickerTitle, body: copy.walkthrough.taskPickerBody },
    { id: "topic-picker", title: copy.walkthrough.topicPickerTitle, body: copy.walkthrough.topicPickerBody },
    { id: "editor", title: copy.walkthrough.editorTitle, body: copy.walkthrough.editorBody },
    {
      id: "correct-button",
      title: copy.walkthrough.correctButtonTitle,
      body: copy.walkthrough.correctButtonBody,
    },
    { id: "nav-dashboard", title: copy.walkthrough.navTitle, body: copy.walkthrough.navBody, placement: "left" },
  ];

  function dismiss() {
    setIsOpen(false);
    void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStepIndex(0);
          setIsOpen(true);
        }}
        className="self-start text-sm font-medium text-violet-700 underline underline-offset-4 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        {copy.walkthrough.takeATour}
      </button>
      <WalkthroughOverlay
        open={isOpen}
        steps={steps}
        stepIndex={stepIndex}
        copy={copy.walkthrough}
        onNext={() => setStepIndex((index) => Math.min(index + 1, steps.length - 1))}
        onBack={() => setStepIndex((index) => Math.max(index - 1, 0))}
        onSkip={dismiss}
        onFinish={dismiss}
      />
    </>
  );
}
