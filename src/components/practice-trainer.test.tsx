import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return {
    useAppLocale: () => ({ locale: "en", setLocale: () => {} }),
    useAppCopy: () => getAppCopy("en"),
  };
});

const { PracticeTrainer } = await import("./practice-trainer");

describe("PracticeTrainer initial render", () => {
  it("renders without crashing before any task/level/topic is selected", () => {
    expect(() =>
      renderToStaticMarkup(<PracticeTrainer curriculum={{ skills: [], exercises: [] }} />),
    ).not.toThrow();
  });
});
