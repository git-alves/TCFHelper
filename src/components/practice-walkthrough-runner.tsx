"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
import {
  getContextualWalkthroughStorage,
  markContextualWalkthroughSeen,
  shouldShowContextualWalkthrough,
} from "@/lib/contextual-walkthrough";

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
  const { register } = useWalkthroughTrigger();
  const [isOpen, setIsOpen] = useState(shouldAutoStart);
  const [stepIndex, setStepIndex] = useState(0);

  // This guide appears only after the learner has deliberately opened
  // Practice. It is separate from the account-level Dashboard orientation,
  // so completing one never suppresses the other.
  useEffect(() => {
    if (shouldAutoStart || !shouldShowContextualWalkthrough(getContextualWalkthroughStorage(), "practice")) return;
    // Defer the state change until after this synchronization effect so the
    // page's initial render stays stable (and the overlay measures its
    // targets only after Practice has painted).
    const timer = window.setTimeout(() => setIsOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [shouldAutoStart]);

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
  ];

  const dismiss = useCallback(() => {
    setIsOpen(false);
    markContextualWalkthroughSeen(getContextualWalkthroughStorage(), "practice");
  }, []);

  return (
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
  );
}
