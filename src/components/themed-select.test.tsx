// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemedSelect } from "./themed-select";

// Regression coverage for a bug where an open ThemedSelect listbox and an
// ancestor Modal both bind an Escape handler to `document`. Because the
// modal's handler is registered first (it mounts before the picker ever
// opens), a plain bubble-phase listener on the picker always loses that
// race and Escape closes the whole modal instead of just the picker.

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderSelect() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <ThemedSelect
        value="a"
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
        onChange={() => {}}
        buttonClassName=""
        listClassName=""
      />,
    );
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function pressEscape() {
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  act(() => {
    document.dispatchEvent(event);
  });
}

describe("ThemedSelect Escape handling", () => {
  it("closes the open listbox without letting Escape reach an ancestor's document-level handler", () => {
    // Simulate an ancestor Modal: it binds its own Escape-to-close handler
    // to document first, exactly as Modal does when it mounts before the
    // user ever opens the picker.
    const outerCloseHandler = vi.fn();
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") outerCloseHandler();
    });

    const el = renderSelect();
    const button = el.querySelector("button") as HTMLButtonElement;
    act(() => button.click());
    expect(el.querySelector('[role="listbox"]')).not.toBeNull();

    pressEscape();

    expect(el.querySelector('[role="listbox"]')).toBeNull();
    expect(outerCloseHandler).not.toHaveBeenCalled();
  });

  it("lets Escape propagate normally when the listbox is closed", () => {
    const outerCloseHandler = vi.fn();
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") outerCloseHandler();
    });

    renderSelect();
    pressEscape();

    expect(outerCloseHandler).toHaveBeenCalledTimes(1);
  });
});
