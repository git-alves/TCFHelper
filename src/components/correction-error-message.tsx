import { Fragment, type ReactNode } from "react";
import type { AppCopy } from "@/lib/app-copy";
import { formatResetTime, type CorrectionErrorState } from "@/lib/correction-error";
import type { AppLocale } from "@/lib/app-locale";

/** Copy marks emphasis with ** **; everything else is plain text. */
export function renderEmphasis(text: string): ReactNode {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>,
  );
}

export function correctionErrorText(error: CorrectionErrorState, copy: AppCopy, locale: AppLocale): string {
  const editor = copy.workspace.editor;
  switch (error.kind) {
    case "dailyLimit":
      return error.resetAt
        ? editor.correctionDailyLimitError({ time: formatResetTime(error.resetAt, locale) })
        : editor.correctionDailyLimitErrorNoTime;
    case "busy":
      return editor.correctionBusyError;
    case "sessionExpired":
      return editor.correctionSessionExpiredError;
    case "generic":
      return editor.genericCorrectionError;
  }
}

/** The learner-facing text of a failed correction, with its emphasis. */
export function CorrectionErrorMessage({
  error,
  copy,
  locale,
}: {
  error: CorrectionErrorState;
  copy: AppCopy;
  locale: AppLocale;
}) {
  return <>{renderEmphasis(correctionErrorText(error, copy, locale))}</>;
}
