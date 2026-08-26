"use client";

import { useState } from "react";
import type { GuideProfile, TaskType } from "@prisma/client";
import type { AppCopy } from "@/lib/app-copy";
import type { AppLocale } from "@/lib/app-locale";
import {
  GUIDE_PROFILE_LABELS,
  TASK_GUIDE_STAGES,
  type GuideStage,
  type TargetLevel,
  getGuidedWritingTips,
  getGuideStageLabel,
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
  // Every task's sequence starts at "start", so this stays valid across a
  // task switch even though the rest of the sequence (and its length)
  // differs per task -- see TASK_GUIDE_STAGES.
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

  const stages = TASK_GUIDE_STAGES[taskType];
  const stageIndex = Math.max(0, stages.indexOf(stage));
  const isFirstStage = stageIndex === 0;
  const isLastStage = stageIndex === stages.length - 1;

  function goToStage(nextIndex: number) {
    const clamped = Math.min(Math.max(nextIndex, 0), stages.length - 1);
    setStage(stages[clamped]);
  }

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
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToStage(stageIndex - 1)}
              disabled={isFirstStage}
              aria-label={gc.previousStage}
              className="rounded-full border border-black/[.15] px-2.5 py-1 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.2] dark:hover:bg-white/[.06]"
            >
              ‹
            </button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">{getGuideStageLabel(locale, taskType, stage)}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {stageIndex + 1} / {stages.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => goToStage(stageIndex + 1)}
              disabled={isLastStage}
              aria-label={gc.nextStage}
              className="rounded-full border border-black/[.15] px-2.5 py-1 text-sm transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.2] dark:hover:bg-white/[.06]"
            >
              ›
            </button>
          </div>
          <PhraseBank
            key={`${profile}:${level}:${stage}`}
            tips={getGuidedWritingTips(profile, level, stage)}
            examplesLabel={gc.examplesLabel}
            morePhrasesLabel={gc.morePhrases}
          />
        </>
      )}
    </div>
  );
}

// Shows only the first few phrases so an advanced stage's larger phrase bank
// (e.g. Tâche 1's combined C1/C2 "Développer" set) doesn't read as a wall of
// text -- see docs/guided-writing.md. Keyed by the caller on
// `${profile}:${level}:${stage}`, so switching stage, level, or writing
// context always remounts this with the disclosure collapsed again, rather
// than needing an effect to reset it.
const PHRASE_PREVIEW_COUNT = 3;

interface PhraseBankProps {
  tips: readonly string[];
  examplesLabel: string;
  morePhrasesLabel: string;
}

// Plain reference text, not buttons: these are examples of the kind of
// phrase or structure to use, not text meant to be pasted wholesale -- see
// docs/guided-writing.md. Phrases run inline, separated by a middle dot,
// instead of one per row, so a longer bank (e.g. Tâche 1's combined C1/C2
// "Développer" set) reads as compact wrapped text rather than a stack of
// rows competing with the editor for vertical space.
function PhraseBank({ tips, examplesLabel, morePhrasesLabel }: PhraseBankProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleTips = isExpanded ? tips : tips.slice(0, PHRASE_PREVIEW_COUNT);
  const remaining = tips.length - visibleTips.length;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {examplesLabel}
      </span>
      <p lang="fr" aria-live="polite" aria-atomic="true" className="text-center text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {visibleTips.map((tip, index) => (
          <span key={tip}>
            {tip}
            {index < visibleTips.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-sm underline underline-offset-2 hover:text-foreground"
        >
          {morePhrasesLabel}
        </button>
      )}
    </div>
  );
}
