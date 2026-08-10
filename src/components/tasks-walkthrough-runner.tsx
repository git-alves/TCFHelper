"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTaskPreview } from "@/components/walkthrough-task-preview";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
import { WALKTHROUGH_CONTINUE_PARAM, WALKTHROUGH_CONTINUE_VALUE } from "@/lib/walkthrough";

interface TasksWalkthroughRunnerProps {
  // A plain boolean, computed server-side from the signed-in learner's
  // walkthroughCompletedVersion -- never the full AppCopy or a richer object
  // crossing the server/client boundary here (see the Dashboard RSC outage).
  shouldAutoStart: boolean;
}

/**
 * Owns the tour itself for the /tasks workspace. Its "Take a tour" trigger
 * lives in the nav bar, not on this page -- see WalkthroughTriggerProvider --
 * so this component only registers a starter function while mounted.
 * Skipping or finishing both record the current walkthrough version -- same
 * meaning either way, see /api/walkthrough/dismiss.
 */
export function TasksWalkthroughRunner({ shouldAutoStart }: TasksWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useWalkthroughTrigger();
  const { requestDefaultTask } = useWalkthroughTaskPreview();
  // A learner who already completed the current version has shouldAutoStart
  // === false here even when they just clicked "Take a tour" on the
  // dashboard and are continuing into these steps -- see
  // DashboardWalkthroughRunner.continueToTasks for where this is set.
  const continueFromDashboard = searchParams.get(WALKTHROUGH_CONTINUE_PARAM) === WALKTHROUGH_CONTINUE_VALUE;
  // Seeded from these rather than set in an effect after mount: both are
  // stable, already-known values for this page load, so there's no external
  // system to synchronize with here, just an initial value.
  const [isOpen, setIsOpen] = useState(shouldAutoStart || continueFromDashboard);
  const [stepIndex, setStepIndex] = useState(0);

  // Consumes the one-time handoff param so refreshing /tasks afterward
  // doesn't reopen the tour. Re-running as continueFromDashboard flips back
  // to false once the param is gone is fine -- it's just a no-op then.
  useEffect(() => {
    if (!continueFromDashboard) return;
    router.replace("/tasks", { scroll: false });
  }, [continueFromDashboard, router]);

  useEffect(() => {
    register(() => {
      setStepIndex(0);
      setIsOpen(true);
    });
    return () => register(null);
  }, [register]);

  // The topic-picker, editor, and correct-button steps below target elements
  // that only render once a task type is selected -- ask WritingWorkspace to
  // preview one the moment the tour opens (auto-start or a manual "Take a
  // tour" replay both flow through isOpen becoming true) so every step has
  // something to point at.
  useEffect(() => {
    if (isOpen) requestDefaultTask();
  }, [isOpen, requestDefaultTask]);

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
