"use server";

import { cookies } from "next/headers";
import {
  APP_LOCALE_COOKIE_MAX_AGE_SECONDS,
  APP_LOCALE_COOKIE_NAME,
  isAppLocale,
} from "@/lib/app-locale";

// The preference is deliberately available before sign-in. An HttpOnly cookie
// makes it available to Server Components without letting unrelated browser
// scripts change the value.
export async function persistAppLocale(value: string) {
  if (!isAppLocale(value)) return;

  const cookieStore = await cookies();
  cookieStore.set(APP_LOCALE_COOKIE_NAME, value, {
    httpOnly: true,
    maxAge: APP_LOCALE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
