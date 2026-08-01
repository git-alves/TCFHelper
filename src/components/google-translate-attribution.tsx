"use client";

const GOOGLE_TRANSLATE_DISCLAIMER =
  "THIS SERVICE MAY CONTAIN TRANSLATIONS POWERED BY GOOGLE. GOOGLE DISCLAIMS ALL WARRANTIES RELATED TO THE TRANSLATIONS, EXPRESS OR IMPLIED, INCLUDING ANY WARRANTIES OF ACCURACY, RELIABILITY, AND ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.";

interface GoogleTranslateAttributionProps {
  alt: string;
  notice: string;
}

// This uses Google's unmodified, official attribution badge. Cloud
// Translation requires it immediately adjacent to any displayed results.
export function GoogleTranslateAttribution({
  alt,
  notice,
}: GoogleTranslateAttributionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
      <a
        href="https://translate.google.com/"
        target="_blank"
        rel="noreferrer"
        aria-label={alt}
        className="inline-flex rounded-sm bg-white px-1 py-1"
      >
        {/* The badge is supplied by Google and must not be altered. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/google-translate-attribution.png"
          width={176}
          height={16}
          alt={alt}
        />
      </a>
      <details>
        <summary className="cursor-pointer underline underline-offset-2">{notice}</summary>
        <p lang="en" className="mt-2 max-w-2xl leading-5">
          {GOOGLE_TRANSLATE_DISCLAIMER}
        </p>
      </details>
    </div>
  );
}
