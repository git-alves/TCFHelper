import { cookies } from "next/headers";
import {
  APP_LOCALE_COOKIE_NAME,
  DEFAULT_APP_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/lib/app-locale";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const candidate = cookieStore.get(APP_LOCALE_COOKIE_NAME)?.value;
  return isAppLocale(candidate) ? candidate : DEFAULT_APP_LOCALE;
}
