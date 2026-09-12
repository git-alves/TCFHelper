"use client";

import { useAppCopy } from "@/components/app-locale-provider";

interface SampleCorrection {
  errorType: "grammar" | "vocabulary";
  originalText: string;
  correctedText: string;
  explanation: string;
}

// Two sample entries -- one grammar, one vocabulary -- standing in for a
// learner's real corrections list (see the Compared tab's "Corrections"
// panel in correction-modal.tsx), reusing that panel's exact card markup
// so this demonstrates the real feature instead of an invented one.
const SAMPLE_CORRECTIONS: SampleCorrection[] = [
  {
    errorType: "grammar",
    originalText: "j'ai allé au marché",
    correctedText: "je suis allé au marché",
    explanation: "Aller is one of the verbs that takes être, not avoir, in the passé composé.",
  },
  {
    errorType: "vocabulary",
    originalText: "sont importants",
    correctedText: "jouent un rôle important",
    explanation: "A more precise, less literal phrasing reads as more natural French at this level.",
  },
];

export function MethodPreview() {
  const copy = useAppCopy();
  const modalCopy = copy.workspace.correctionModal;

  return (
    <div className="rounded-2xl border border-white/[.12] p-4 sm:p-5">
      <h3 className="font-semibold text-zinc-100">{modalCopy.correctionsHeading({ count: SAMPLE_CORRECTIONS.length })}</h3>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {SAMPLE_CORRECTIONS.map((correction, index) => (
          <li key={index} className="overflow-hidden rounded-xl border border-white/[.12] text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 p-3">
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{modalCopy.errorLabel}</span>
                  <span lang="fr" className="break-words text-red-300 line-through decoration-red-400">
                    {correction.originalText}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{modalCopy.correctionLabel}</span>
                  <strong lang="fr" className="break-words text-emerald-300">
                    {correction.correctedText}
                  </strong>
                  <span className="rounded-full bg-white/[.1] px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-zinc-300">
                    {copy.workspace.feedback.errorCategories[correction.errorType]}
                  </span>
                </span>
              </span>
            </div>
            <div className="border-t border-white/[.12] px-3 py-3">
              <p className="break-words leading-6 text-zinc-300">
                <span className="font-medium text-zinc-100">{modalCopy.noteLabel}: </span>
                {correction.explanation}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
