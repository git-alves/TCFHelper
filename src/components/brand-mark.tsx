// The MyTCFLab mark: a speech bubble (writing/feedback) with a checkmark
// (correction). Outline and writing lines use `currentColor` so the icon
// always matches the surrounding text color (the home page's fixed light
// text on its dark header, or the tool's `dark:`-aware foreground).
//
// The checkmark's violet accent can't just key off the `dark:` variant: the
// home page's header is unconditionally dark regardless of the app's
// light/dark theme setting, so `dark:text-violet-300` would fall back to
// the light-mode violet-700 (too low-contrast on the near-black header)
// whenever a visitor's resolved theme happens to be light. Callers on a
// fixed-dark surface should pass `accentClassName="text-violet-300"`
// explicitly; everywhere else the theme-aware pair is the right default.
export function BrandMark({ className, accentClassName = "text-violet-700 dark:text-violet-300" }: { className?: string; accentClassName?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M6.5 5.5h14c2 0 3.5 1.5 3.5 3.5v8.5c0 2-1.5 3.5-3.5 3.5H14l-4.5 3.5 1-3.5H6.5c-2 0-3.5-1.5-3.5-3.5V9c0-2 1.5-3.5 3.5-3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7.5 11h10M7.5 14.3h7.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M14.5 18.3l2 2 4.5-5.3"
        fill="none"
        className={accentClassName}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
