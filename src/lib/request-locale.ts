import { cookies, headers } from "next/headers";
import {
  APP_LOCALE_COOKIE_NAME,
  DEFAULT_APP_LOCALE,
  isAppLocale,
  pickLocaleFromAcceptLanguage,
  type AppLocale,
} from "@/lib/app-locale";

// An explicit choice from the settings picker (persisted as a cookie by
// persistAppLocale) always wins. Only before that ever happens does the
// browser's own Accept-Language header pick the default, so the app opens in
// the learner's browser language without requiring a manual first switch.
export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const candidate = cookieStore.get(APP_LOCALE_COOKIE_NAME)?.value;
  if (isAppLocale(candidate)) return candidate;

  const headerStore = await headers();
  return pickLocaleFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_APP_LOCALE;
}
