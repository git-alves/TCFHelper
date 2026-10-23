// @vitest-environment happy-dom
//
// Only irreversible deletes/resets get the red confirm action. Recoverable
// confirmations (access deactivation, account block) stay neutral.
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAppCopy } from "@/lib/app-copy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { AdminAccessCodeDeleteButton } = await import("./admin-access-code-delete-button");
const { AdminAccessCodesTable } = await import("./admin-access-codes-table");
const { AdminSupportDeleteButton } = await import("./admin-support-delete-button");
const { AdminUserActivationStatus } = await import("./admin-user-activation-status");
const { AdminUserAccountStatus } = await import("./admin-user-account-status");
const { PracticeProgressCardContent } = await import("./practice-progress-card");

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(element: ReactElement) {
  act(() => {
    root.render(element);
  });
}

function clickByText(text: string) {
  const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`button "${text}" not found`);
  act(() => {
    button.click();
  });
}

function confirmButtonLabelled(label: string) {
  const dialog = document.querySelector('[role="alertdialog"]');
  const button = [...(dialog?.querySelectorAll("button") ?? [])].find((candidate) => candidate.textContent?.trim() === label);
  if (!button) throw new Error(`dialog button "${label}" not found`);
  return button;
}

const isRed = (button: Element) => button.className.includes("bg-red-700") && !button.className.includes("bg-foreground");
const isNeutral = (button: Element) => button.className.includes("bg-foreground") && !button.className.includes("bg-red-");

describe("destructive confirm dialogs", () => {
  it("is red for deleting one access code", () => {
    render(<AdminAccessCodeDeleteButton accessCodeId="code_1" code="TCF-AAAA" />);
    clickByText("Delete");

    expect(isRed(confirmButtonLabelled("Delete"))).toBe(true);
  });

  it("is red for bulk-deleting access codes", () => {
    render(
      <AdminAccessCodesTable
        accessCodes={[
          {
            id: "code_1",
            code: "TCF-AAAA-AAAA-AAAA-AAAA",
            note: null,
            createdAt: "2026-08-01T00:00:00.000Z",
            redeemedAt: null,
            redeemedByUserEmail: null,
            validityDays: null,
            expiresAt: null,
          },
        ]}
      />,
    );
    act(() => {
      (container.querySelector('input[aria-label="Select access code TCF-AAAA-AAAA-AAAA-AAAA"]') as HTMLInputElement).click();
    });
    clickByText("Delete selected");

    expect(isRed(confirmButtonLabelled("Delete"))).toBe(true);
  });

  it("is red for deleting a support request", () => {
    render(<AdminSupportDeleteButton requestId="request_1" isSyncedToHubspot={false} />);
    clickByText("Delete");

    expect(isRed(confirmButtonLabelled("Delete"))).toBe(true);
  });

  it("is red for clearing practice progress", () => {
    render(
      <PracticeProgressCardContent
        copy={getAppCopy("en")}
        summary={{ completedExercises: 5, completedIndependently: 4, completedWithHelp: 1 }}
      />,
    );
    clickByText("Clear progress");

    expect(isRed(confirmButtonLabelled("Clear progress"))).toBe(true);
  });

  it("stays neutral for deactivating learner access, which can be undone with a new code", () => {
    render(
      <AdminUserActivationStatus
        userId="user_1"
        email="learner@example.com"
        activationStamp="2026-08-01T00:00:00.000Z"
        hasLiveAdmission
        isCurrentAdmin={false}
      />,
    );
    clickByText("Deactivate access");

    expect(isNeutral(confirmButtonLabelled("Deactivate access"))).toBe(true);
  });

  it("stays neutral for blocking a user, which an admin can reverse", () => {
    render(<AdminUserAccountStatus userId="user_1" email="learner@example.com" isBlocked={false} isCurrentAdmin={false} />);
    clickByText("Block user");

    expect(isNeutral(confirmButtonLabelled("Block user"))).toBe(true);
  });
});
