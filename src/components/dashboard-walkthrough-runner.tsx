"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";

interface DashboardWalkthroughRunnerProps {
  shouldAutoStart: boolean;
  /** The choice panel only exists while the learner has no prior work. */
  hasGettingStarted: boolean;
}

/**
 * The dashboard tour introduces the learner's starting choice. It does not
 * force a cross-page sequence: selecting Practice or Tasks remains the
 * learner's decision, and each page can offer its own concise guide later.
 */
export function DashboardWalkthroughRunner({ shouldAutoStart, hasGettingStarted }: DashboardWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const { register } = useWalkthroughTrigger();
  // Seeded from the prop rather than set in an effect after mount: it's a
  // stable, server-computed value for this page load, so there's no
  // external system to synchronize with here, just an initial value.
  // Returning learners may receive a newer tour version, but the first-use
  // choice panel is intentionally absent once they have work. Do not open a
  // tour against a target that is not rendered; the reusable manual tour
  // below instead points at the permanent dashboard content.
  const [isOpen, setIsOpen] = useState(shouldAutoStart && hasGettingStarted);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    register(() => {
      setStepIndex(0);
      setIsOpen(true);
    });
    return () => register(null);
  }, [register]);

  const steps: WalkthroughStepContent[] = hasGettingStarted
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

  // Stable across renders (not a plain function, recreated every render):
  // WalkthroughOverlay's focus-trap effect keys on this via onSkip, so a
  // new identity on every step change made it tear down and rebuild that
  // effect each time -- restoring focus to whatever was active before the
  // tour ever opened, right before immediately refocusing the Next button.
  const dismiss = useCallback(() => {
    setIsOpen(false);
    void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
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
