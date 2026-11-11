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

const { SupportForm, SupportSentConfirmation } = await import("./support-form");

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

describe("SupportSentConfirmation", () => {
  it("confirms the submission with its ticket number", () => {
    const markup = renderToStaticMarkup(<SupportSentConfirmation ticketNumber={42} onSendAnother={() => {}} />);

    expect(markup).toContain("Ticket #42 sent");
    expect(markup).toContain("Your message has been sent to the MyTCFLab team.");
  });

  it("falls back to the plain confirmation when the response carried no ticket number", () => {
    const markup = renderToStaticMarkup(<SupportSentConfirmation ticketNumber={null} onSendAnother={() => {}} />);

    expect(markup).toContain("Thanks for reaching out");
    expect(markup).not.toContain("#");
  });

  it.each([
    ["en", "Ticket #42 sent"],
    ["fr", "Ticket nº 42 envoyé"],
    ["es", "Ticket nº 42 enviado"],
    ["pt", "Chamado nº 42 enviado"],
  ] as const)("words the confirmation for %s", (locale, expected) => {
    expect(getAppCopy(locale).support.successTicketTitle({ number: 42 })).toBe(expected);
  });
});

