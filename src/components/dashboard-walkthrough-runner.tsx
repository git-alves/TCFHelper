"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { WALKTHROUGH_CONTINUE_PARAM, WALKTHROUGH_CONTINUE_VALUE } from "@/lib/walkthrough";

interface DashboardWalkthroughRunnerProps {
  shouldAutoStart: boolean;
}

/**
 * The dashboard half of the walkthrough hands off to the /tasks half by a
 * real navigation, not shared client state -- finishing this one (as
 * opposed to skipping it) does not itself record a dismissed version. If
 * the learner navigates to /tasks from here, its own runner sees the same
 * still-unrecorded version and auto-starts there too, continuing the tour
 * across the page boundary without any cross-page orchestration.
 */
export function DashboardWalkthroughRunner({ shouldAutoStart }: DashboardWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const router = useRouter();
  // Seeded from the prop rather than set in an effect after mount: it's a
  // stable, server-computed value for this page load, so there's no
  // external system to synchronize with here, just an initial value.
  const [isOpen, setIsOpen] = useState(shouldAutoStart);
  const [stepIndex, setStepIndex] = useState(0);

  const steps: WalkthroughStepContent[] = [
    {
      id: "dashboard-welcome",
      title: copy.walkthrough.dashboardWelcomeTitle,
      body: copy.walkthrough.dashboardWelcomeBody,
    },
    {
      id: "dashboard-start-writing",
      title: copy.walkthrough.dashboardStartWritingTitle,
      body: copy.walkthrough.dashboardStartWritingBody,
    },
  ];

  function dismiss() {
    setIsOpen(false);
    void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
  }

  function continueToTasks() {
    setIsOpen(false);
    // Only meaningful for a manual re-trigger by a learner who has already
    // completed the current version -- shouldAutoStart alone would be false
    // for them on /tasks. A genuine first-time run doesn't need this: both
    // pages already read the same still-unrecorded (null) version.
    router.push(`/tasks?${WALKTHROUGH_CONTINUE_PARAM}=${WALKTHROUGH_CONTINUE_VALUE}`);
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
        onFinish={continueToTasks}
      />
    </>
  );
}
