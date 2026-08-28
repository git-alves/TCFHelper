"use client";

import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { useAppTheme } from "@/components/app-theme-provider";
import { ThemedSelect } from "@/components/themed-select";
import { APP_LOCALES, APP_LOCALE_LABELS } from "@/lib/app-locale";
import { APP_THEMES, type AppTheme } from "@/lib/app-theme";

const SELECT_BUTTON_CLASSNAME =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-black/[.15] bg-background px-4 py-2.5 text-left text-sm outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]";
const SELECT_LIST_CLASSNAME =
  "absolute left-0 right-0 z-20 mt-1 flex max-h-60 flex-col gap-0.5 overflow-auto rounded-xl border border-black/[.15] bg-background p-1 shadow-lg dark:border-white/[.2]";

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
        <ThemedSelect<AppTheme>
          ariaLabelledBy="appearance-heading"
          value={theme}
          onChange={setTheme}
          options={APP_THEMES.map((option) => ({ value: option, label: themeLabels[option] }))}
          buttonClassName={SELECT_BUTTON_CLASSNAME}
          listClassName={SELECT_LIST_CLASSNAME}
        />
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
        <ThemedSelect<typeof locale>
          ariaLabelledBy="language-heading"
          value={locale}
          onChange={setLocale}
          options={APP_LOCALES.map((code) => ({ value: code, label: APP_LOCALE_LABELS[code] }))}
          buttonClassName={SELECT_BUTTON_CLASSNAME}
          listClassName={SELECT_LIST_CLASSNAME}
        />
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
