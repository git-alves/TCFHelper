"use client";

import { useRouter } from "next/navigation";
import type { TaskType } from "@prisma/client";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { CorrectionModal } from "@/components/correction-modal";
import type { EssayFeedback } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";

interface CorrectionHistoryDialogProps {
  detail: {
    id: string;
    taskType: TaskType;
    originalText: string;
    feedback: EssayFeedback;
  };
}

/** A detail URL can reuse the same reviewed result surface without a client API. */
export function CorrectionHistoryDialog({ detail }: CorrectionHistoryDialogProps) {
  const router = useRouter();
  const copy = useAppCopy();
  const { locale } = useAppLocale();

  return (
    <CorrectionModal
      open
      state="result"
      task={TASK_INSTRUCTIONS[detail.taskType]}
      submissionId={detail.id}
      originalText={detail.originalText}
      feedback={detail.feedback}
      feedbackLocale={null}
      locale={locale}
      isStale={false}
      copy={copy}
      onClose={() => router.replace("/dashboard/history")}
      onRetry={() => undefined}
    />
  );
}
