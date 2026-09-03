import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return {
    useAppCopy: () => getAppCopy("en"),
    useAppLocale: () => ({ locale: "en", setLocale: () => {} }),
  };
});

vi.mock("@/components/app-theme-provider", () => ({
  useAppTheme: () => ({ theme: "dark", setTheme: () => {} }),
}));

const { SettingsForm } = await import("./settings-form");

describe("SettingsForm appearance toggle", () => {
  it("shows System, Dark, and Light as a three-way toggle with the current theme checked", () => {
    const markup = renderToStaticMarkup(<SettingsForm name="Ada Learner" email="learner@example.com" avatarUrl={null} />);

    expect(markup).toContain('role="radiogroup"');
    const system = markup.indexOf(">System<");
    const dark = markup.indexOf(">Dark<");
    const light = markup.indexOf(">Light<");
    expect(system).toBeGreaterThan(0);
    expect(dark).toBeGreaterThan(system);
    expect(light).toBeGreaterThan(dark);

    // The mocked theme is "dark": exactly one option should be checked.
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
    const darkButtonStart = markup.lastIndexOf("<button", dark);
    expect(markup.slice(darkButtonStart, dark)).toContain('aria-checked="true"');
  });
});
