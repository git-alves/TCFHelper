"use client";

import { useState } from "react";
import type { GuideProfile, TaskType } from "@prisma/client";
import type { AppCopy } from "@/lib/app-copy";
import type { AppLocale } from "@/lib/app-locale";
import {
  GUIDE_PROFILE_LABELS,
  GUIDE_STAGES,
  GUIDE_STAGE_LABELS,
  type GuideStage,
  type TargetLevel,
  getGuidedWritingTips,
} from "@/lib/guided-writing";
import { classifyWritingContext, type WritingContextClassification } from "@/lib/guided-writing-classifier";

// The profiles a learner can choose between when the deterministic
// classifier can't tell from the prompt's wording alone -- see
// classifyWritingContext. Task 3 is never ambiguous (always
// ARGUMENTATIVE_ANALYSIS), so it never reaches this confirmation UI.
const CONFIRMABLE_PROFILES: Record<TaskType, readonly GuideProfile[]> = {
  TASK_1: ["INFORMAL_PERSONAL_MESSAGE", "FORMAL_PROFESSIONAL_MESSAGE"],
  TASK_2: ["PUBLIC_ARTICLE_OR_NOTE", "PUBLIC_LETTER"],
  TASK_3: ["ARGUMENTATIVE_ANALYSIS"],
};

// The caller remounts this component when task, topic mode, or recent-topic
// identity changes. A custom prompt stays in the same component while it is
// being typed, but a learner's manual context choice is scoped to the exact
// trimmed prompt it was made for. Editing that prompt therefore never leaves
// a stale formal/informal override attached to a different writing subject.
interface WritingGuidePanelProps {
  taskType: TaskType;
  topicMode: "recent" | "custom";
  // Server-classified for a recent-exam topic (see /api/topics/recent) --
  // null only while that topic is still loading.
  recentTopicContext: WritingContextClassification | null;
  customTopicPrompt: string;
  level: TargetLevel;
  locale: AppLocale;
  copy: AppCopy;
}

export function WritingGuidePanel({
  taskType,
  topicMode,
  recentTopicContext,
  customTopicPrompt,
  level,
  locale,
  copy,
}: WritingGuidePanelProps) {
  const [stage, setStage] = useState<GuideStage>("start");
  const [override, setOverride] = useState<{ profile: GuideProfile; customTopicPrompt: string | null } | null>(null);
  const [isChoosingContext, setIsChoosingContext] = useState(false);
  const [contextChoicePrompt, setContextChoicePrompt] = useState<string | null>(null);
  const trimmedCustomTopicPrompt = customTopicPrompt.trim();

  const detected: WritingContextClassification | null =
    topicMode === "recent"
      ? recentTopicContext
      : trimmedCustomTopicPrompt
        ? classifyWritingContext(taskType, customTopicPrompt)
        : null;

  const gc = copy.workspace.guidedWriting;
  const activeOverride =
    override && (topicMode === "recent" || override.customTopicPrompt === trimmedCustomTopicPrompt) ? override : null;
  const isChoosingContextForCurrentTopic =
    isChoosingContext && (topicMode === "recent" || contextChoicePrompt === trimmedCustomTopicPrompt);
  const profile = activeOverride?.profile ?? detected?.profile ?? null;
  const needsConfirmation = !activeOverride && detected?.confidence === "needs_confirmation";
  const confirmableProfiles = CONFIRMABLE_PROFILES[taskType];

  if (!profile) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-black/[.1] bg-black/[.015] p-4 dark:border-white/[.15] dark:bg-white/[.02]"
      aria-label={gc.heading}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{gc.guideForLevel({ level })}</h3>
        {!needsConfirmation && !isChoosingContextForCurrentTopic && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span>{gc.contextLabel({ profile: GUIDE_PROFILE_LABELS[locale][profile] })}</span>
            {confirmableProfiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setContextChoicePrompt(topicMode === "custom" ? trimmedCustomTopicPrompt : null);
                  setIsChoosingContext(true);
                }}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {gc.changeContext}
              </button>
            )}
          </div>
        )}
      </div>

      {(needsConfirmation || isChoosingContextForCurrentTopic) && confirmableProfiles.length > 1 ? (
        <div className="flex flex-col gap-2" role="group" aria-label={gc.contextConfirmHeading}>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {gc.contextConfirmHeading} — {gc.contextConfirmPrompt}
          </p>
          <div className="flex flex-wrap gap-2">
            {confirmableProfiles.map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => {
                  setOverride({
                    profile: candidate,
                    customTopicPrompt: topicMode === "custom" ? trimmedCustomTopicPrompt : null,
                  });
                  setIsChoosingContext(false);
                }}
                aria-pressed={activeOverride?.profile === candidate}
                className="rounded-full border border-black/[.15] px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {GUIDE_PROFILE_LABELS[locale][candidate]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={gc.heading}>
            {GUIDE_STAGES.map((candidateStage) => (
              <button
                key={candidateStage}
                type="button"
                aria-pressed={stage === candidateStage}
                onClick={() => setStage(candidateStage)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  stage === candidateStage
                    ? "bg-foreground text-background"
                    : "border border-black/[.15] hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                }`}
              >
                {GUIDE_STAGE_LABELS[locale][candidateStage]}
              </button>
            ))}
          </div>
          <ul aria-live="polite" aria-atomic="true" className="list-disc space-y-1 pl-5 text-sm">
            {getGuidedWritingTips(locale, profile, level, stage).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
