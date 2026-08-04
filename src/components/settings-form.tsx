"use client";

import { useAppCopy } from "@/components/app-locale-provider";
import { useAppTheme } from "@/components/app-theme-provider";
import { APP_THEMES, type AppTheme } from "@/lib/app-theme";

export function SettingsForm() {
  const copy = useAppCopy();
  const { theme, setTheme } = useAppTheme();

  const themeLabels: Record<AppTheme, string> = {
    light: copy.settings.themeLight,
    dark: copy.settings.themeDark,
    system: copy.settings.themeSystem,
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.settings.title}</h1>

      <section className="flex flex-col gap-3" aria-labelledby="appearance-heading">
        <div>
          <h2 id="appearance-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {copy.settings.appearanceHeading}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {copy.settings.appearanceDescription}
          </p>
        </div>
        <div role="radiogroup" aria-labelledby="appearance-heading" className="grid gap-3 sm:grid-cols-3">
          {APP_THEMES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              onClick={() => setTheme(option)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                theme === option
                  ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                  : "border-black/[.15] hover:bg-black/[.03] dark:border-white/[.2] dark:hover:bg-white/[.05]"
              }`}
            >
              <span className="block font-medium">{themeLabels[option]}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
