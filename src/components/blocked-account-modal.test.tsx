import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: signOutMock }),
}));

import { BlockedAccountModal } from "./blocked-account-modal";

describe("BlockedAccountModal", () => {
  it("presents the supplied recovery copy, support action, and an explicit sign-in close control", () => {
    const markup = renderToStaticMarkup(
      createElement(BlockedAccountModal, { sessionId: "sess_blocked_1" }),
    );

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("We were unable to access your account");
    expect(markup).toContain("Please contact support!");
    expect(markup).toContain('href="mailto:support@mytcflab.com"');
    expect(markup).toContain("Contact Support");
    expect(markup).toContain('aria-label="Close and return to sign in"');
  });
});
