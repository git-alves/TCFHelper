"use client";

import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

/** A small, self-contained clipboard action; the caller supplies its own layout. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [result, setResult] = useState<"idle" | "copied" | "failed">("idle");

  function clearResultSoon() {
    setTimeout(() => setResult("idle"), 2_000);
  }

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setResult("copied");
      clearResultSoon();
    } catch {
      // Clipboard access can be denied by a browser or embedded preview. The
      // code remains visible, but the control must still say what happened so
      // the owner knows to select and copy it manually.
      setResult("failed");
      clearResultSoon();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={
          className ??
          "rounded-full border border-black/[.15] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
        }
      >
        {result === "copied" ? "Copied" : result === "failed" ? "Copy failed" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {result === "copied" ? "Code copied to clipboard." : result === "failed" ? "Copy failed. Select the visible code and copy it manually." : ""}
      </span>
    </>
  );
}
