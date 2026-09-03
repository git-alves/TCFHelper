"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { WalkthroughOverlay, type WalkthroughStepContent } from "@/components/walkthrough-overlay";
import { useWalkthroughTrigger } from "@/components/walkthrough-trigger";
import { useWalkthroughWorkspaceScript } from "@/components/walkthrough-workspace-script";
import {
  getContextualWalkthroughStorage,
  markContextualWalkthroughSeen,
  shouldShowContextualWalkthrough,
} from "@/lib/contextual-walkthrough";
import { FULL_WALKTHROUGH_PARAM, isFullWalkthrough } from "@/lib/walkthrough";

interface TasksWalkthroughRunnerProps {
  // A plain boolean, computed server-side from the signed-in learner's
  // walkthroughCompletedVersion -- never the full AppCopy or a richer object
  // crossing the server/client boundary here (see the Dashboard RSC outage).
  shouldAutoStart: boolean;
}

/**
 * Owns the tour itself for the /tasks workspace. Its "Take a tour" trigger
 * lives in the nav bar, not on this page -- see WalkthroughTriggerProvider --
 * so this component only registers a starter function while mounted. Its
 * concise guide is remembered on this browser after either Skip or Finish;
 * it does not change the account-level Dashboard orientation state.
 *
 * Most of these steps drive WritingWorkspace's real state (select a task,
 * fetch a topic, paste a sample response, show a canned correction preview)
 * instead of just pointing at it -- see WalkthroughWorkspaceScriptProvider.
 * This runner only announces which step is active; WritingWorkspace decides
 * what that means and guards every action so it can never overwrite a
 * returning learner's real in-progress work.
 */
export function TasksWalkthroughRunner({ shouldAutoStart }: TasksWalkthroughRunnerProps) {
  const copy = useAppCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useWalkthroughTrigger();
  const { applyStep, resetDemo } = useWalkthroughWorkspaceScript();
  const [isFullTour] = useState(() => isFullWalkthrough(searchParams.get(FULL_WALKTHROUGH_PARAM)));
  const [isOpen, setIsOpen] = useState(shouldAutoStart || isFullTour);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isFullTour) return;
    router.replace("/tasks", { scroll: false });
  }, [isFullTour, router]);

  // Show this concise guide when the learner chooses Full task for the first
  // time on this browser. It does not depend on, or redirect from, Practice.
  useEffect(() => {
    if (shouldAutoStart || isFullTour || !shouldShowContextualWalkthrough(getContextualWalkthroughStorage(), "tasks")) return;
    // Let the workspace render its first state before opening a guide that
    // measures targets and drives its illustrative sample.
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

  const shortSteps: WalkthroughStepContent[] = [
    { id: "task-picker", title: copy.walkthrough.taskPickerTitle, body: copy.walkthrough.taskPickerBody },
    { id: "topic-picker", title: copy.walkthrough.topicPickerTitle, body: copy.walkthrough.topicPickerBody },
    { id: "editor", title: copy.walkthrough.editorTitle, body: copy.walkthrough.editorBody },
    {
      id: "correct-button",
      title: copy.walkthrough.correctButtonTitle,
      body: copy.walkthrough.correctButtonBody,
    },
  ];
  const steps: WalkthroughStepContent[] = isFullTour
    ? [
        ...shortSteps.slice(0, 2),
        { id: "guided-writing", title: copy.walkthrough.guidedWritingTitle, body: copy.walkthrough.guidedWritingBody },
        { id: "timed-task", title: copy.walkthrough.timedTaskTourTitle, body: copy.walkthrough.timedTaskTourBody },
        ...shortSteps.slice(2),
        {
          id: "correction-modal",
          title: copy.walkthrough.correctionModalTitle,
          body: copy.walkthrough.correctionModalBody,
        },
        {
          id: "example-generate",
          title: copy.walkthrough.exampleGenerateTitle,
          body: copy.walkthrough.exampleGenerateBody,
        },
        { id: "editor-copy", title: copy.walkthrough.editorCopyTitle, body: copy.walkthrough.editorCopyBody },
        { id: "editor-clear", title: copy.walkthrough.editorClearTitle, body: copy.walkthrough.editorClearBody },
        { id: "translation", title: copy.walkthrough.translationTitle, body: copy.walkthrough.translationBody },
        { id: "nav-dashboard", title: copy.walkthrough.navTitle, body: copy.walkthrough.navBody, placement: "left" },
      ]
    : shortSteps;

  // Announces the active step to WritingWorkspace so it can drive its own
  // state (see applyWalkthroughStep there) -- fires on open and on every
  // step change, not just individual step ids, so re-opening always
  // re-announces the current step. A step can report back that it turned
  // out to have nothing to show (e.g. correction-modal with no real or
  // scripted feedback available), in which case this advances past it
  // immediately instead of leaving the tour stalled on a target that will
  // never appear -- re-running this same effect for whatever step that
  // lands on, cascading if that one also has nothing to show.
  const activeStepId = isOpen ? (steps[stepIndex]?.id ?? null) : null;
  const stepCount = steps.length;
  useEffect(() => {
    if (!activeStepId) return;
    const shouldSkip = applyStep(activeStepId);
    if (!shouldSkip) return;
    // Deferred rather than called directly in the effect body: this is a
    // reaction to applyStep's result (an external system, from this
    // component's point of view), not a value derivable during render.
    const timer = setTimeout(() => {
      setStepIndex((index) => Math.min(index + 1, stepCount - 1));
    }, 0);
    return () => clearTimeout(timer);
  }, [activeStepId, applyStep, stepCount]);

  // Stable across renders (not a plain function, recreated every render):
  // WalkthroughOverlay's focus-trap effect keys on this via onSkip, so a
  // new identity on every step change made it tear down and rebuild that
  // effect each time -- restoring focus to whatever was active before the
  // tour ever opened, right before immediately refocusing the Next button.
  const dismiss = useCallback(() => {
    setIsOpen(false);
    resetDemo();
    markContextualWalkthroughSeen(getContextualWalkthroughStorage(), "tasks");
    if (isFullTour) void fetch("/api/walkthrough/dismiss", { method: "POST" }).catch(() => {});
  }, [isFullTour, resetDemo]);

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
      progress={isFullTour ? { step: stepIndex + 9, total: 20 } : undefined}
    />
  );
}
