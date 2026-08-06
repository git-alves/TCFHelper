"use client";

import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { useAppTheme } from "@/components/app-theme-provider";
import { APP_LOCALES, APP_LOCALE_LABELS } from "@/lib/app-locale";
import { APP_THEMES, type AppTheme } from "@/lib/app-theme";

interface SettingsFormProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function SettingsForm({ name, email, avatarUrl }: SettingsFormProps) {
  const copy = useAppCopy();
  const { theme, setTheme } = useAppTheme();
  const { locale, setLocale } = useAppLocale();

  const themeLabels: Record<AppTheme, string> = {
    light: copy.settings.themeLight,
    dark: copy.settings.themeDark,
    system: copy.settings.themeSystem,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">{copy.settings.title}</h1>

      <div className="flex items-center gap-4">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- externally hosted (Google/Clerk) avatar, not a local optimizable asset
          <img src={avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        )}
        <div>
          <p className="font-medium">{name ?? email}</p>
          {name && <p className="text-sm text-zinc-500 dark:text-zinc-400">{email}</p>}
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="appearance-heading">
        <div>
          <h2 id="appearance-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {copy.settings.appearanceHeading}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {copy.settings.appearanceDescription}
          </p>
        </div>
        <select
          aria-labelledby="appearance-heading"
          value={theme}
          onChange={(event) => setTheme(event.target.value as AppTheme)}
          className="rounded-xl border border-black/[.15] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]"
        >
          {APP_THEMES.map((option) => (
            <option key={option} value={option} className="text-black">
              {themeLabels[option]}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="language-heading">
        <div>
          <h2 id="language-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {copy.settings.languageHeading}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {copy.settings.languageDescription}
          </p>
        </div>
        <select
          aria-labelledby="language-heading"
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          className="rounded-xl border border-black/[.15] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]"
        >
          {APP_LOCALES.map((code) => (
            <option key={code} value={code} className="text-black">
              {APP_LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="help-heading">
        <h2 id="help-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {copy.settings.helpHeading}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{copy.settings.helpDescription}</p>
        <a
          href="mailto:support@mytcflab.com"
          className="self-start text-sm underline underline-offset-2 hover:text-foreground"
        >
          support@mytcflab.com
        </a>
      </section>
    </div>
  );
}
