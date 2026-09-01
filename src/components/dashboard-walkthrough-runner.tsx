"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
import {
  FULL_WALKTHROUGH_PARAM,
  FULL_WALKTHROUGH_VALUE,
  isFullWalkthrough,
} from "@/lib/walkthrough";

interface DashboardWalkthroughRunnerProps {
  shouldAutoStart: boolean;
  /** The choice panel only exists while the learner has no prior work. */
  hasGettingStarted: boolean;
}

/**
 * New learners and learners who choose "Take a tour" follow the same
 * comprehensive Dashboard → Practice → Full task walkthrough.
 */
export function DashboardWalkthroughRunner({ shouldAutoStart, hasGettingStarted }: DashboardWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useWalkthroughTrigger();
  const [isFullTour] = useState(
    () => shouldAutoStart || isFullWalkthrough(searchParams.get(FULL_WALKTHROUGH_PARAM)),
  );
  // Seeded from the prop rather than set in an effect after mount: it's a
  // stable, server-computed value for this page load, so there's no
  // external system to synchronize with here, just an initial value.
  // Returning learners may receive a newer tour version, but the first-use
  // choice panel is intentionally absent once they have work. Do not open a
  // tour against a target that is not rendered; the reusable manual tour
  // below instead points at the permanent dashboard content.
  const [isOpen, setIsOpen] = useState(isFullTour);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    register(() => {
      router.push(`/dashboard?${FULL_WALKTHROUGH_PARAM}=${FULL_WALKTHROUGH_VALUE}`);
    });
    return () => register(null);
  }, [register, router]);

  // Consume the start signal so a refresh does not reopen a manual tour.
  // isFullTour is preserved in state for this mounted run, so replacing the
  // URL cannot shorten the active tour back to the first-use guide.
  useEffect(() => {
    if (!isFullTour) return;
    router.replace("/dashboard", { scroll: false });
  }, [isFullTour, router]);

  const fullTourSteps: WalkthroughStepContent[] = [
    {
      id: "dashboard-welcome",
      title: copy.walkthrough.dashboardWelcomeTitle,
      body: copy.walkthrough.dashboardWelcomeBody,
    },
    {
      id: "dashboard-corrections",
      title: copy.walkthrough.dashboardCorrectionsTitle,
      body: copy.walkthrough.dashboardCorrectionsBody,
    },
    {
      id: "nav-settings",
      title: copy.walkthrough.settingsTitle,
      body: copy.walkthrough.settingsBody,
      placement: "bottom",
    },
    {
      id: "nav-practice",
      title: copy.walkthrough.dashboardPracticeTitle,
      body: copy.walkthrough.dashboardPracticeBody,
      placement: "bottom",
    },
  ];

  const firstUseSteps: WalkthroughStepContent[] = hasGettingStarted
    ? [
        {
          id: "dashboard-start",
          title: copy.walkthrough.dashboardWelcomeTitle,
          body: copy.walkthrough.dashboardWelcomeBody,
        },
        {
          id: "nav-practice",
          title: copy.walkthrough.dashboardPracticeTitle,
          body: copy.walkthrough.dashboardPracticeBody,
          placement: "bottom",
        },
        {
          id: "nav-tasks",
          title: copy.walkthrough.dashboardStartWritingTitle,
          body: copy.walkthrough.dashboardStartWritingBody,
          placement: "bottom",
        },
      ]
    : [
        {
          id: "dashboard-welcome",
          title: copy.walkthrough.dashboardWelcomeTitle,
          body: copy.walkthrough.dashboardWelcomeBody,
        },
      ];
  const steps = isFullTour ? fullTourSteps : firstUseSteps;

  // Stable across renders (not a plain function, recreated every render):
  // WalkthroughOverlay's focus-trap effect keys on this via onSkip, so a
  // new identity on every step change made it tear down and rebuild that
  // effect each time -- restoring focus to whatever was active before the
  // tour ever opened, right before immediately refocusing the Next button.
  const dismiss = useCallback(() => {
    setIsOpen(false);
    void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
  }, []);

  const continueToPractice = useCallback(() => {
    setIsOpen(false);
    router.push(`/practice?${FULL_WALKTHROUGH_PARAM}=${FULL_WALKTHROUGH_VALUE}`);
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
      onFinish={isFullTour ? continueToPractice : dismiss}
      progress={isFullTour ? { step: stepIndex + 1, total: 19 } : undefined}
      finishLabel={isFullTour ? copy.walkthrough.continueToPractice : undefined}
    />
  );
}
