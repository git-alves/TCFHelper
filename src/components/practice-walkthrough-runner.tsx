"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
import {
  getContextualWalkthroughStorage,
  markContextualWalkthroughSeen,
  shouldShowContextualWalkthrough,
} from "@/lib/contextual-walkthrough";
import { FULL_WALKTHROUGH_PARAM, FULL_WALKTHROUGH_VALUE, isFullWalkthrough } from "@/lib/walkthrough";

interface PracticeWalkthroughRunnerProps {
  shouldAutoStart: boolean;
}

/**
 * The middle page in the app tour. Unlike the full-task walkthrough, this
 * never populates a learner response: it only introduces the fixed task-part
 * curriculum and the controlled-to-independent practice progression.
 */
export function PracticeWalkthroughRunner({ shouldAutoStart }: PracticeWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useWalkthroughTrigger();
  const [isFullTour] = useState(() => isFullWalkthrough(searchParams.get(FULL_WALKTHROUGH_PARAM)));
  const [isOpen, setIsOpen] = useState(shouldAutoStart || isFullTour);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isFullTour) return;
    router.replace("/practice", { scroll: false });
  }, [isFullTour, router]);

  // This guide appears only after the learner has deliberately opened
  // Practice. It is separate from the account-level Dashboard orientation,
  // so completing one never suppresses the other.
  useEffect(() => {
    if (shouldAutoStart || isFullTour || !shouldShowContextualWalkthrough(getContextualWalkthroughStorage(), "practice")) return;
    // Defer the state change until after this synchronization effect so the
    // page's initial render stays stable (and the overlay measures its
    // targets only after Practice has painted).
    const timer = window.setTimeout(() => setIsOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [isFullTour, shouldAutoStart]);

  useEffect(() => {
    register(() => {
      setStepIndex(0);
      setIsOpen(true);
    });
    return () => register(null);
  }, [register]);

  const steps: WalkthroughStepContent[] = [
    {
      id: "practice-intro",
      title: copy.walkthrough.practiceIntroTitle,
      body: copy.walkthrough.practiceIntroBody,
    },
    {
      id: "practice-part-selector",
      title: copy.walkthrough.practicePartsTitle,
      body: copy.walkthrough.practicePartsBody,
    },
    ...(isFullTour
      ? [
          {
            id: "practice-stages-preview",
            title: copy.walkthrough.practiceStagesTitle,
            body: copy.walkthrough.practiceStagesBody,
          },
        ]
      : []),
  ];

  const dismiss = useCallback(() => {
    setIsOpen(false);
    markContextualWalkthroughSeen(getContextualWalkthroughStorage(), "practice");
    if (isFullTour) void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
  }, [isFullTour]);

  const continueToTasks = useCallback(() => {
    setIsOpen(false);
    // The comprehensive tour already covered Practice, so returning here
    // later should not immediately launch the shorter contextual guide.
    markContextualWalkthroughSeen(getContextualWalkthroughStorage(), "practice");
    router.push(`/tasks?${FULL_WALKTHROUGH_PARAM}=${FULL_WALKTHROUGH_VALUE}`);
  }, [router]);

  return (
    <WalkthroughOverlay
      open={isOpen}
      steps={steps}
      stepIndex={stepIndex}
      copy={copy.walkthrough}
      onNext={() => setStepIndex((index) => Math.min(index + 1, steps.length - 1))}
      onBack={() => setStepIndex((index) => Math.max(index - 1, 0))}
      onSkip={dismiss}
      onFinish={isFullTour ? continueToTasks : dismiss}
      progress={isFullTour ? { step: stepIndex + 6, total: 20 } : undefined}
      finishLabel={isFullTour ? copy.walkthrough.continueToFullTask : undefined}
    />
  );
}
