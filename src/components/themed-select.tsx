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

type MenuPlacement = "auto" | "above" | "below";

interface MenuBounds {
  triggerTop: number;
  triggerBottom: number;
  boundaryTop: number;
  boundaryBottom: number;
  menuHeight: number;
}

// A dropdown inside a scrollable modal must fit within the modal's visible
// slice, not merely the browser viewport. Otherwise a trigger near the
// bottom opens its list into clipped, scrollable space (as Settings' language
// picker used to). Prefer the usual downward direction when it fits; only
// flip when above has more usable room.
export function selectMenuPlacement({
  triggerTop,
  triggerBottom,
  boundaryTop,
  boundaryBottom,
  menuHeight,
}: MenuBounds): Exclude<MenuPlacement, "auto"> {
  const roomBelow = boundaryBottom - triggerBottom;
  const roomAbove = triggerTop - boundaryTop;
  return roomBelow >= menuHeight || roomBelow >= roomAbove ? "below" : "above";
}

interface ThemedSelectProps<T extends string> {
  id?: string;
  value: T;
  options: readonly ThemedSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  disabled?: boolean;
  menuPlacement?: MenuPlacement;
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
  ariaRequired,
  ariaInvalid,
  disabled,
  menuPlacement = "auto",
  buttonClassName,
  listClassName,
  optionClassName = "w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]",
}: ThemedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<Exclude<MenuPlacement, "auto">>("below");
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

  function visibleBoundaryFor(element: HTMLElement) {
    let ancestor = element.parentElement;
    while (ancestor) {
      const { overflow, overflowY } = window.getComputedStyle(ancestor);
      if (/(auto|scroll|hidden|clip)/.test(`${overflow} ${overflowY}`)) {
        const bounds = ancestor.getBoundingClientRect();
        return {
          top: Math.max(0, bounds.top),
          bottom: Math.min(window.innerHeight, bounds.bottom),
        };
      }
      ancestor = ancestor.parentElement;
    }
    return { top: 0, bottom: window.innerHeight };
  }

  function resolveMenuPlacement(): Exclude<MenuPlacement, "auto"> {
    if (menuPlacement !== "auto") return menuPlacement;
    const trigger = containerRef.current?.getBoundingClientRect();
    if (!trigger) return "below";

    const boundary = visibleBoundaryFor(containerRef.current!);
    // Options use text-sm with py-1.5; this slightly generous estimate avoids
    // opening downward for a list that would immediately be clipped. The
    // existing max-h-60 is retained by consumers for unusually long lists.
    const estimatedHeight = Math.min(options.length * 38 + 10, 240);
    return selectMenuPlacement({
      triggerTop: trigger.top,
      triggerBottom: trigger.bottom,
      boundaryTop: boundary.top,
      boundaryBottom: boundary.bottom,
      menuHeight: estimatedHeight,
    });
  }

  function toggleMenu() {
    if (!isOpen) setResolvedPlacement(resolveMenuPlacement());
    setIsOpen((open) => !open);
  }

  const listStyle =
    resolvedPlacement === "above"
      ? { bottom: "100%", marginTop: 0, marginBottom: "0.25rem" }
      : { top: "100%" };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        aria-required={ariaRequired}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={toggleMenu}
        className={buttonClassName}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <span aria-hidden="true" className="shrink-0 text-xs opacity-60">
          ▾
        </span>
      </button>
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={ariaLabelledBy}
          className={listClassName}
          style={listStyle}
        >
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
