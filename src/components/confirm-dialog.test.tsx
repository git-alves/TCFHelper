// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/confirm-dialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function confirmButton(destructive?: boolean) {
  act(() => {
    root.render(
      <ConfirmDialog
        open
        title="Delete?"
        description="Cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive={destructive}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
  });
  return [...container.querySelectorAll("button")].find((button) => button.textContent === "Delete")!;
}

describe("ConfirmDialog", () => {
  it("renders the confirm action in red when destructive", () => {
    const button = confirmButton(true);

    expect(button.className).toContain("bg-red-700");
    expect(button.className).not.toContain("bg-foreground");
  });

  it("keeps the neutral confirm style by default", () => {
    const button = confirmButton();

    expect(button.className).toContain("bg-foreground");
    expect(button.className).not.toContain("bg-red-");
  });
});
