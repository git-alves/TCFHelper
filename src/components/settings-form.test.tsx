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
    expect(markup.match(/type="radio"/g)).toHaveLength(3);
    // Real inputs, not button role="radio": arrow-key/tab-stop behavior
    // between options must come from the browser, not custom key handling.
    expect(markup).not.toContain('role="radio"');

    const system = markup.indexOf(">System<");
    const dark = markup.indexOf(">Dark<");
    const light = markup.indexOf(">Light<");
    expect(system).toBeGreaterThan(0);
    expect(dark).toBeGreaterThan(system);
    expect(light).toBeGreaterThan(dark);

    // The mocked theme is "dark": exactly one option should be checked.
    expect(markup.match(/checked=""/g)).toHaveLength(1);
    const darkLabelStart = markup.lastIndexOf("<label", dark);
    expect(markup.slice(darkLabelStart, dark)).toContain('checked=""');
  });
});
