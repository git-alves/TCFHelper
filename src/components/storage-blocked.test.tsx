// @vitest-environment happy-dom
//
// Browser storage is only a convenience. With it blocked (every call throws,
// or even reading window.localStorage throws) the app shell, the workspace and
// the practice trainer must still render and work, not crash.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { AppThemeProvider, resetUnsavedThemeForTest, useAppTheme } from "@/components/app-theme-provider";
import { DashboardNavGuardProvider } from "@/components/dashboard-nav-guard";
import { PracticeTrainer } from "@/components/practice-trainer";
import { WalkthroughWorkspaceScriptProvider } from "@/components/walkthrough-workspace-script";
import { WritingWorkspace } from "@/components/writing-workspace";
import { getAppCopy } from "@/lib/app-copy";
import { installFakeLocalStorage, installUnreachableLocalStorage } from "@/lib/draft-autosave.test-helpers";
import { SECTIONED_PRACTICE_EXERCISES } from "@/lib/sectioned-practice";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/locale-actions", () => ({ persistAppLocale: vi.fn(async () => ({ ok: true })) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copy = getAppCopy("en");
let container: HTMLDivElement;
let root: Root;
let restoreStorage: (() => void) | undefined;

function ThemeProbe() {
  const { theme, setTheme } = useAppTheme();
  return (
    <>
      <output data-testid="theme">{theme}</output>
      <button type="button" onClick={() => setTheme("dark")}>
        go dark
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        go light
      </button>
    </>
  );
}

beforeEach(() => {
  resetUnsavedThemeForTest();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  restoreStorage?.();
  restoreStorage = undefined;
  vi.unstubAllGlobals();
});

const blockedStorages = [
  ["every storage call throws", () => installFakeLocalStorage({ failReads: true, failWrites: true })],
  ["even reading window.localStorage throws", () => installUnreachableLocalStorage()],
] as const;

describe.each(blockedStorages)("with storage blocked (%s)", (_name, install) => {
  it("renders the app shell and the writing workspace", async () => {
    restoreStorage = install().restore;

    await act(async () => {
      root.render(
        <AppThemeProvider>
          <AppLocaleProvider initialLocale="en">
            <DashboardNavGuardProvider>
              <WalkthroughWorkspaceScriptProvider>
                <ThemeProbe />
                <WritingWorkspace />
              </WalkthroughWorkspaceScriptProvider>
            </DashboardNavGuardProvider>
          </AppLocaleProvider>
        </AppThemeProvider>,
      );
    });

    expect(container.textContent).toContain(copy.workspace.task.heading);
    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe("system");
  });

  it("still lets the learner change the theme for the rest of the visit", async () => {
    restoreStorage = install().restore;
    await act(async () => {
      root.render(
        <AppThemeProvider>
          <ThemeProbe />
        </AppThemeProvider>,
      );
    });

    const press = (label: string) =>
      act(async () => {
        [...container.querySelectorAll("button")].find((candidate) => candidate.textContent === label)!.click();
      });
    await press("go dark");
    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe("dark");
    await press("go light");
    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe("light");
  });

  it("renders the practice trainer", async () => {
    restoreStorage = install().restore;

    await act(async () => {
      root.render(
        <AppLocaleProvider initialLocale="en">
          <PracticeTrainer exercises={SECTIONED_PRACTICE_EXERCISES} />
        </AppLocaleProvider>,
      );
    });

    expect(container.textContent).toContain("Practise one task, section by section.");
  });
});
