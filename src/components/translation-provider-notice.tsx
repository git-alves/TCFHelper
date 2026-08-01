"use client";

interface TranslationProviderNoticeProps {
  provider: "deepl" | "unofficial";
  deeplNotice: string;
  unofficialFallbackNotice: string;
}

// DeepL's API Free terms do not require end-user attribution, so this is a
// lightweight credit rather than a compliance badge. The unofficial-fallback
// case is the learner-facing disclosure the product decision requires: a
// draft was sent through Google's public web endpoint (not DeepL's API, no
// SLA, can be blocked) rather than being hidden behind a generic notice.
export function TranslationProviderNotice({
  provider,
  deeplNotice,
  unofficialFallbackNotice,
}: TranslationProviderNoticeProps) {
  if (provider === "unofficial") {
    return (
      <p role="status" className="text-xs text-amber-600 dark:text-amber-400">
        {unofficialFallbackNotice}
      </p>
    );
  }

  return <p className="text-xs text-zinc-500 dark:text-zinc-400">{deeplNotice}</p>;
}
