"use client";

import { useAppCopy } from "@/components/app-locale-provider";
import { useAppTheme } from "@/components/app-theme-provider";
import { APP_THEMES, type AppTheme } from "@/lib/app-theme";

interface SettingsFormProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function SettingsForm({ name, email, avatarUrl }: SettingsFormProps) {
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
