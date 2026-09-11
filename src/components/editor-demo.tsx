"use client";

import { useEffect, useState } from "react";

type DemoPhase = "typing" | "correcting" | "corrected" | "resetting";

const TYPE_INTERVAL_MS = 18;
const BEFORE_CORRECTING_PAUSE_MS = 300;
const CORRECTING_MS = 700;
const CORRECTED_HOLD_MS = 1800;
const RESET_PAUSE_MS = 500;

interface EditorDemoProps {
  badge: string;
  writingStatus: string;
  correctingStatus: string;
  correctedStatus: string;
  draftText: string;
  correctedText: string;
  analysis: { label: string; value: string }[];
}

// A looping, fast-forward mockup of the actual editor -- draft, correction,
// then feedback tags -- so the hero shows the product working instead of a
// static screenshot. Purely decorative: the same before/after text and
// analysis are already present as real, accessible content further down the
// page (see the "proof" section in home-hero.tsx), so this is hidden from
// assistive tech rather than narrated as a live region.
export function EditorDemo({ badge, writingStatus, correctingStatus, correctedStatus, draftText, correctedText, analysis }: EditorDemoProps) {
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
      if (typedLength >= draftText.length) {
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
  }, [phase, typedLength, draftText.length, reducedMotion]);

  const isCorrected = phase === "corrected";
  const bodyText = isCorrected ? correctedText : phase === "resetting" ? "" : draftText.slice(0, typedLength);
  const statusText =
    phase === "correcting" ? correctingStatus : phase === "corrected" ? correctedStatus : writingStatus;

  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-12 w-full max-w-xl overflow-hidden rounded-2xl border border-white/[.12] bg-black/30 text-left shadow-2xl shadow-black/40"
    >
      <div className="flex items-center justify-between border-b border-white/[.1] bg-white/[.03] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/[.06] px-2.5 py-1 text-xs font-medium text-zinc-300">
            <span className="online-now-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {badge}
          </span>
        </div>
        <span className={`text-xs font-medium ${isCorrected ? "text-emerald-300" : "text-zinc-400"}`}>{statusText}</span>
      </div>

      <div className="min-h-[168px] px-5 py-5 text-base leading-7">
        <p key={phase} className={`demo-line-in ${isCorrected ? "text-white" : "text-zinc-300"}`}>
          {bodyText}
          {phase === "typing" && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-violet-300 align-middle" />
          )}
        </p>
      </div>

      <div className={`flex flex-wrap gap-2 border-t border-white/[.1] px-5 py-4 transition-opacity duration-500 ${isCorrected ? "opacity-100" : "opacity-0"}`}>
        {analysis.map((item) => (
          <span key={item.label} className="rounded-full border border-violet-300/30 bg-violet-400/[.08] px-3 py-1 text-xs text-violet-100">
            {item.label}: {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}
