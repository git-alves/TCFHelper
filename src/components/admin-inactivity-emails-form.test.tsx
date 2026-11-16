import { describe, expect, it } from "vitest";
import { resetInactivityEmailTemplate } from "./admin-inactivity-emails-form";

describe("resetInactivityEmailTemplate", () => {
  it("restores built-in text instead of the saved customized text", () => {
    expect(
      resetInactivityEmailTemplate({
        subject: "Saved custom",
        body: "Saved custom body",
        defaultSubject: "Built-in subject",
        defaultBody: "Built-in body",
        button: "Return",
        customized: true,
      }),
    ).toMatchObject({
      subject: "Built-in subject",
      body: "Built-in body",
      customized: false,
    });
  });
});
