"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
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
 *
 * Its "Take a tour" trigger lives in the nav bar, not on this page -- see
 * WalkthroughTriggerProvider -- so this component only registers a starter
 * function while mounted, rather than rendering its own button.
 */
export function DashboardWalkthroughRunner({ shouldAutoStart }: DashboardWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const router = useRouter();
  const { register } = useWalkthroughTrigger();
  // Seeded from the prop rather than set in an effect after mount: it's a
  // stable, server-computed value for this page load, so there's no
  // external system to synchronize with here, just an initial value.
  const [isOpen, setIsOpen] = useState(shouldAutoStart);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    register(() => {
      setStepIndex(0);
      setIsOpen(true);
    });
    return () => register(null);
  }, [register]);

  const steps: WalkthroughStepContent[] = [
    {
      id: "dashboard-welcome",
      title: copy.walkthrough.dashboardWelcomeTitle,
      body: copy.walkthrough.dashboardWelcomeBody,
    },
    {
      id: "nav-tasks",
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
  );
}
