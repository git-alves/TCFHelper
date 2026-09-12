"use client";

import { useEffect, useState } from "react";
import { useAppCopy } from "@/components/app-locale-provider";

type DemoPhase = "typing" | "correcting" | "corrected" | "resetting";
type DiffSegment = { type: "same" | "removed" | "added"; text: string };

const TYPE_INTERVAL_MS = 18;
const BEFORE_CORRECTING_PAUSE_MS = 300;
const CORRECTING_MS = 1300;
const CORRECTED_HOLD_MS = 4500;
const RESET_PAUSE_MS = 500;

const MIN_WORDS = 20;
const MAX_WORDS = 40;
const CORRECTED_WORD_COUNT = 28;

const DRAFT_TEXT =
  "Je pense que les réseaux sociaux sont importants parce que les gens peuvent facilement communiquer avec leurs amis et découvrir des informations.";

// The same before/after TCF sample shown in the page's "proof" section,
// reconstructed as an inline diff -- removed text struck through in red,
// corrected text highlighted in green -- matching the real correction
// modal's Compared tab (see correction-modal.tsx's line-through/emerald
// classes) rather than an invented style.
const DIFF: DiffSegment[] = [
  { type: "removed", text: "Je pense que" },
  { type: "same", text: " " },
  { type: "added", text: "À mon avis," },
  { type: "same", text: " les réseaux sociaux " },
  { type: "removed", text: "sont importants" },
  { type: "same", text: " " },
  { type: "added", text: "jouent un rôle important dans notre quotidien," },
  { type: "same", text: " " },
  { type: "removed", text: "parce que" },
  { type: "same", text: " " },
  { type: "added", text: "car" },
  { type: "same", text: " " },
  { type: "removed", text: "les gens peuvent facilement communiquer avec leurs amis" },
  { type: "same", text: " " },
  { type: "added", text: "ils permettent de rester en contact avec nos proches" },
  { type: "same", text: " " },
  { type: "removed", text: "et découvrir des informations." },
  { type: "same", text: " " },
  { type: "added", text: "tout en facilitant l’accès à l’information." },
];

interface EditorDemoProps {
  taskLabel: string;
  taskPrompt: string;
}

// A looping, fast-forward mockup of the actual editor screen -- a task
// prompt, the real Correct button and word-count pill, a loading state,
// then the same red/green inline diff the correction modal's Compared tab
// shows -- so the hero demonstrates the product's real UI instead of an
// invented one. Purely decorative: the same before/after text is already
// present as real, accessible content further down the page (see the
// "proof" section in home-hero.tsx), so this is hidden from assistive tech
// rather than narrated as a live region.
export function EditorDemo({ taskLabel, taskPrompt }: EditorDemoProps) {
  const copy = useAppCopy();
  const [phase, setPhase] = useState<DemoPhase>("typing");
  const [typedLength, setTypedLength] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    function applyReducedMotion() {
      setReducedMotion(true);
      setPhase("corrected");
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyReducedMotion();
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    if (phase === "typing") {
      if (typedLength >= DRAFT_TEXT.length) {
        const timeout = setTimeout(() => setPhase("correcting"), BEFORE_CORRECTING_PAUSE_MS);
        return () => clearTimeout(timeout);
      }
      const timeout = setTimeout(() => setTypedLength((length) => length + 1), TYPE_INTERVAL_MS);
      return () => clearTimeout(timeout);
    }

    if (phase === "correcting") {
      const timeout = setTimeout(() => setPhase("corrected"), CORRECTING_MS);
      return () => clearTimeout(timeout);
    }

    if (phase === "corrected") {
      const timeout = setTimeout(() => setPhase("resetting"), CORRECTED_HOLD_MS);
      return () => clearTimeout(timeout);
    }

    // "resetting"
    const timeout = setTimeout(() => {
      setTypedLength(0);
      setPhase("typing");
    }, RESET_PAUSE_MS);
    return () => clearTimeout(timeout);
  }, [phase, typedLength, reducedMotion]);

  const typedText = DRAFT_TEXT.slice(0, typedLength);
  const wordCount = typedText.trim() ? typedText.trim().split(/\s+/).length : 0;
  const isWordCountInRange = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const showCorrecting = phase === "correcting";
  const showResult = phase === "corrected" || phase === "resetting";

  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-12 flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-white/[.12] bg-black/30 p-5 text-left shadow-2xl shadow-black/40"
    >
      <div className="rounded-xl border border-white/[.1] bg-white/[.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{taskLabel}</p>
        <p className="mt-1 text-sm text-zinc-400">{taskPrompt}</p>
      </div>

      {/* A CSS-grid stack, not absolutely-positioned overlays: every phase
       * is a normal grid item sharing the same cell, so the row's auto
       * height is always the tallest phase's natural content height --
       * including the diff phase, which is much taller than the others on
       * narrow screens (it shows both the removed and added text at once).
       * Absolute positioning would pull the inactive phases out of layout
       * entirely, leaving the container's height to whichever phase is
       * currently active and making it visibly grow/shrink between phases,
       * pushing everything below it up and down each loop. */}
      <div className="grid">
        <div
          className={`[grid-area:1/1] transition-opacity duration-300 ${showCorrecting || showResult ? "pointer-events-none opacity-0" : "opacity-100"}`}
        >
          <div className="min-h-[130px] rounded-xl border border-white/[.25] bg-white/[.03] px-4 py-3 text-base leading-7 text-zinc-200">
            {typedText}
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-violet-300 align-middle" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="self-start rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black">
              {copy.workspace.editor.correct}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isWordCountInRange ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
              }`}
            >
              {copy.workspace.correctionModal.wordCount({ count: wordCount, minWords: MIN_WORDS, maxWords: MAX_WORDS })}
            </span>
          </div>
        </div>

        <div className={`[grid-area:1/1] transition-opacity duration-300 ${showCorrecting ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-200">{copy.workspace.correctionModal.loading}</p>
          </div>
        </div>

        <div className={`[grid-area:1/1] transition-opacity duration-300 ${showResult ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-300">{copy.workspace.correctionModal.statusEvaluated}</span>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-300">
              {copy.workspace.correctionModal.wordCount({ count: CORRECTED_WORD_COUNT, minWords: MIN_WORDS, maxWords: MAX_WORDS })}
            </span>
            <span className="rounded-full bg-violet-400/15 px-2.5 py-1 text-violet-300">
              {copy.workspace.correctionModal.demonstratedLevel({ level: "B2" })}
            </span>
          </div>
          <p key={phase} className="demo-line-in mt-3 rounded-xl border border-white/[.1] bg-white/[.03] px-4 py-3 text-base leading-7 text-zinc-200">
            {DIFF.map((segment, index) => {
              if (segment.type === "removed") {
                return (
                  <span key={index} className="text-red-300 line-through decoration-red-400">
                    {segment.text}
                  </span>
                );
              }
              if (segment.type === "added") {
                return (
                  <span key={index} className="rounded bg-emerald-400/15 px-0.5 font-semibold text-emerald-300">
                    {segment.text}
                  </span>
                );
              }
              return <span key={index}>{segment.text}</span>;
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
