import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SUPPORT_CATEGORIES } from "@/lib/support-request";
import { getAppCopy } from "@/lib/app-copy";

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return {
    useAppCopy: () => getAppCopy("en"),
    useAppLocale: () => ({ locale: "en" }),
  };
});

const { SupportForm } = await import("./support-form");

describe("SupportForm", () => {
  it("shows the signed-in sender, details, and an optional file control", () => {
    const markup = renderToStaticMarkup(<SupportForm email="learner@example.com" name="Ada Learner" />);

    expect(markup).toContain("Send as");
    expect(markup).toContain("Ada Learner · learner@example.com");
    expect(markup).toContain("Choose one…");
    expect(markup).toContain("Details");
    expect(markup).toContain("Attachment");
    expect(markup).toContain("optional");
    expect(markup).toContain('type="file"');
  });

  it("keeps the complete requested category set in the shared picker contract", () => {
    expect(SUPPORT_CATEGORIES).toEqual([
      "BUG",
      "QUESTION",
      "FEATURE_REQUEST_FEEDBACK",
      "ACCOUNT_ACCESS",
      "OTHER",
    ]);
    expect(Object.values(getAppCopy("en").support.categories)).toEqual([
      "Bug",
      "Question",
      "Feature request / feedback",
      "Account & access",
      "Other",
    ]);
  });
});
