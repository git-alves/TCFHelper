"use client";

interface TranslationProviderNoticeProps {
  provider: "deepl" | "unofficial";
  unofficialFallbackNotice: string;
}

// DeepL's API Free terms don't require end-user attribution, so unlike the
// unofficial-fallback case below there's no product requirement to credit it
// — this renders nothing for the normal "deepl" case. The unofficial case is
// the learner-facing disclosure the product decision requires: a draft was
// sent through Google's public web endpoint (not DeepL's API, no SLA, can be
// blocked) rather than being hidden behind a generic notice.
export function TranslationProviderNotice({ provider, unofficialFallbackNotice }: TranslationProviderNoticeProps) {
  if (provider !== "unofficial") return null;

  return (
    <p role="status" className="text-xs text-amber-600 dark:text-amber-400">
      {unofficialFallbackNotice}
    </p>
  );
}
