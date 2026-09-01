"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
import { WALKTHROUGH_CONTINUE_PARAM, WALKTHROUGH_CONTINUE_VALUE } from "@/lib/walkthrough";

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
  const continueFromTour = searchParams.get(WALKTHROUGH_CONTINUE_PARAM) === WALKTHROUGH_CONTINUE_VALUE;
  const [isOpen, setIsOpen] = useState(shouldAutoStart || continueFromTour);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!continueFromTour) return;
    router.replace("/practice", { scroll: false });
  }, [continueFromTour, router]);

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
    {
      id: "nav-tasks",
      title: copy.walkthrough.practiceFullTaskTitle,
      body: copy.walkthrough.practiceFullTaskBody,
      placement: "left",
    },
  ];

  const dismiss = useCallback(() => {
    setIsOpen(false);
    void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
  }, []);

  function continueToTasks() {
    setIsOpen(false);
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
