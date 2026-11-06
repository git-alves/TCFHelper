import { isAppLocale, type AppLocale } from "@/lib/app-locale";
import { getRequestLocale } from "@/lib/request-locale";

export interface LegalSearchParams {
  lang?: string | string[];
}

/**
 * Which language a legal page renders in. An explicit `?lang=` (the language
 * links on the page itself) wins, so anyone can reach the controlling English
 * text; otherwise it follows the same locale as the rest of the app.
 */
export async function resolveLegalLocale(
  searchParams: Promise<LegalSearchParams>,
): Promise<{ locale: AppLocale; pinned: boolean }> {
  const { lang } = await searchParams;
  const candidate = Array.isArray(lang) ? lang[0] : lang;
  if (isAppLocale(candidate)) return { locale: candidate, pinned: true };
  return { locale: await getRequestLocale(), pinned: false };
}
