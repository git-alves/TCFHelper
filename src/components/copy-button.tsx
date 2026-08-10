"use client";

import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

/** A small, self-contained clipboard action; the caller supplies its own layout. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; the code is still
      // visible as plain text, so there is nothing further to recover.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={
        className ??
        "rounded-full border border-black/[.15] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
      }
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
