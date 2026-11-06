// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptOverrideDisplay } from "@/lib/prompt-overrides";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { AdminPromptsForm } = await import("./admin-prompts-form");
const { AdminPromptsNavGuardProvider, AdminPromptsNavLink, useAdminPromptsNavGuard } = await import(
  "./admin-prompts-nav-guard"
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DISPLAY = {
  correctionBase: { label: "Base prompt", value: null, defaultValue: "default text" },
} as unknown as PromptOverrideDisplay;

let container: HTMLDivElement;
let root: Root;

function Probe() {
  return <span data-testid="guard" data-dirty={String(useAdminPromptsNavGuard().hasUnsavedChanges)} />;
}

function guardIsDirty() {
  return container.querySelector("[data-testid=guard]")!.getAttribute("data-dirty") === "true";
}

// Mirrors the admin layout: the provider and sidebar link persist while the
// page (and so the form) mounts and unmounts beneath them.
function Harness({ showForm }: { showForm: boolean }) {
  return (
    <AdminPromptsNavGuardProvider>
      <Probe />
      <AdminPromptsNavLink href="/admin/users">Users</AdminPromptsNavLink>
      {showForm && <AdminPromptsForm initialDisplay={DISPLAY} />}
    </AdminPromptsNavGuardProvider>
  );
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// happy-dom does not implement window.confirm.
function mockConfirm(answer: boolean) {
  const confirmFn = vi.fn(() => answer);
  window.confirm = confirmFn;
  return confirmFn;
}

function editTextarea(value: string) {
  const textarea = container.querySelector("textarea")!;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("admin prompts navigation guard", () => {
  it("clears the guard once the dirty form unmounts, so later sidebar clicks stop prompting", () => {
    const confirmSpy = mockConfirm(true);
    act(() => root.render(<Harness showForm />));

    editTextarea("an unsaved edit");
    expect(guardIsDirty()).toBe(true);

    // The admin confirms leaving Prompts; the page (and form) unmount while
    // the layout-level provider stays mounted.
    act(() => root.render(<Harness showForm={false} />));
    expect(guardIsDirty()).toBe(false);

    const link = container.querySelector("a")!;
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      link.dispatchEvent(click);
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });

  it("still confirms a sidebar click while the form has unsaved edits", () => {
    const confirmSpy = mockConfirm(false);
    act(() => root.render(<Harness showForm />));
    editTextarea("an unsaved edit");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      container.querySelector("a")!.dispatchEvent(click);
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(click.defaultPrevented).toBe(true);
  });
});
