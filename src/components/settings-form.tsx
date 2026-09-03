"use client";

import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { useAppTheme } from "@/components/app-theme-provider";
import { ThemedSelect } from "@/components/themed-select";
import { APP_LOCALES, APP_LOCALE_LABELS } from "@/lib/app-locale";
import type { AppTheme } from "@/lib/app-theme";

const SELECT_BUTTON_CLASSNAME =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-black/[.15] bg-background px-4 py-2.5 text-left text-sm outline-none focus:border-black/[.4] dark:border-white/[.2] dark:focus:border-white/[.5]";
const SELECT_LIST_CLASSNAME =
  "absolute left-0 right-0 z-20 mt-1 flex max-h-60 flex-col gap-0.5 overflow-auto rounded-xl border border-black/[.15] bg-background p-1 shadow-lg dark:border-white/[.2]";

// System / Dark / Light, matching the reference layout -- deliberately not
// APP_THEMES's own declaration order ("light", "dark", "system").
const THEME_TOGGLE_ORDER: readonly AppTheme[] = ["system", "dark", "light"];

function MonitorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="10" rx="1.5" />
      <path strokeLinecap="round" d="M7 17h6M10 14v3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.5a6.5 6.5 0 1 1-7-9.9 5.25 5.25 0 0 0 7 9.9Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="3.25" />
      <path
        strokeLinecap="round"
        d="M10 2.5v1.75M10 15.75v1.75M17.5 10h-1.75M4.25 10H2.5M15.3 4.7l-1.24 1.24M5.94 14.06l-1.24 1.24M15.3 15.3l-1.24-1.24M5.94 5.94 4.7 4.7"
      />
    </svg>
  );
}

const THEME_ICONS: Record<AppTheme, () => React.JSX.Element> = {
  system: MonitorIcon,
  dark: MoonIcon,
  light: SunIcon,
};

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
        {/* Native radios, not button role="radio": a fake ARIA radiogroup
         * still needs its own arrow-key/roving-tabindex handling to behave
         * like one, which plain buttons never got here. Real inputs give
         * that keyboard behavior (arrows move and select, one tab stop) for
         * free, so this only has to style them, not reimplement them. */}
        <div
          role="radiogroup"
          aria-labelledby="appearance-heading"
          className="flex w-full rounded-xl border border-black/[.15] bg-black/[.02] p-1 dark:border-white/[.2] dark:bg-white/[.03]"
        >
          {THEME_TOGGLE_ORDER.map((option) => {
            const isActive = theme === option;
            const Icon = THEME_ICONS[option];
            return (
              <label
                key={option}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-violet-500/50 ${
                  isActive
                    ? "bg-background text-foreground shadow-sm dark:bg-white/[.12]"
                    : "text-zinc-500 hover:text-foreground dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="appearance-theme"
                  value={option}
                  checked={isActive}
                  onChange={() => setTheme(option)}
                  className="sr-only"
                />
                <Icon />
                {themeLabels[option]}
              </label>
            );
          })}
        </div>
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
    </div>
  );
}
