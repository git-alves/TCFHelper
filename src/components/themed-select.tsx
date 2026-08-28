"use client";

import { useEffect, useId, useRef, useState } from "react";

// A native <select>'s open popup is rendered by the OS/browser chrome, not
// the page -- Chromium in particular ignores author CSS (background-color,
// color-scheme) for that popup, so it stays white even when everything else
// respects the app's dark class. This renders the closed control and its
// option list as ordinary positioned DOM instead, so dark mode reaches both.
export interface ThemedSelectOption<T extends string> {
  value: T;
  label: string;
}

interface ThemedSelectProps<T extends string> {
  id?: string;
  value: T;
  options: readonly ThemedSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  disabled?: boolean;
  buttonClassName: string;
  listClassName: string;
  optionClassName?: string;
}

export function ThemedSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  ariaLabelledBy,
  ariaLabel,
  disabled,
  buttonClassName,
  listClassName,
  optionClassName = "w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]",
}: ThemedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={buttonClassName}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <span aria-hidden="true" className="shrink-0 text-xs opacity-60">
          ▾
        </span>
      </button>
      {isOpen && (
        <ul id={listboxId} role="listbox" aria-labelledby={ariaLabelledBy} className={listClassName}>
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={optionClassName}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
