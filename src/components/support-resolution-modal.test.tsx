// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localeMock = vi.hoisted(() => ({ locale: "en" as "en" | "fr" | "es" | "pt" }));

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return { useAppCopy: () => getAppCopy(localeMock.locale) };
});

const { SupportResolutionModal } = await import("./support-resolution-modal");

const notice = {
  id: "req_7",
  ticketNumber: 7,
  resolutionNote: "We fixed the editor freezing.",
  resolvedAt: "2026-11-12T10:00:00.000Z",
};

let container: HTMLDivElement;
let root: Root;
const onAnswer = vi.fn();
const onDismiss = vi.fn();

function render(props: Partial<React.ComponentProps<typeof SupportResolutionModal>> = {}) {
  act(() => {
    root.render(
      <SupportResolutionModal notice={notice} isBusy={false} hasError={false} onAnswer={onAnswer} onDismiss={onDismiss} {...props} />,
    );
  });
}

function button(label: string) {
  const found = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label || candidate.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error(`No button "${label}"`);
  return found as HTMLButtonElement;
}

beforeEach(() => {
  localeMock.locale = "en";
  onAnswer.mockReset();
  onDismiss.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SupportResolutionModal", () => {
  it("says which ticket was resolved, shows the admin's note and asks the learner to test and confirm", () => {
    render();

    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Ticket #7 was resolved");
    expect(dialog.textContent).toContain("Please test it and let us know whether it worked.");
    expect(dialog.textContent).toContain("Note from support");
    expect(dialog.textContent).toContain("We fixed the editor freezing.");
  });

  it("leaves out the note section when the admin wrote none", () => {
    render({ notice: { ...notice, resolutionNote: null } });

    expect(container.textContent).not.toContain("Note from support");
  });

  it("offers exactly the two answers and the X, and focuses the first answer", () => {
    render();

    expect(Array.from(container.querySelectorAll("button")).map((b) => b.textContent || b.getAttribute("aria-label"))).toEqual([
      "Close",
      "It worked",
      "I still have the problem",
    ]);
    expect(document.activeElement).toBe(button("It worked"));
  });

  it('"It worked" and "I still have the problem" report their own answer and nothing else', () => {
    render();

    act(() => button("It worked").click());
    expect(onAnswer).toHaveBeenLastCalledWith("WORKED");
    act(() => button("I still have the problem").click());
    expect(onAnswer).toHaveBeenLastCalledWith("STILL_BROKEN");
    expect(onAnswer).toHaveBeenCalledTimes(2);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("the X dismisses without any answer", () => {
    render();

    act(() => button("Close").click());

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("Escape behaves like the X", () => {
    render();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("clicking the backdrop does nothing, so the notice is never dismissed for good by accident", () => {
    render();

    act(() => {
      (container.firstElementChild as HTMLElement).click();
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("disables every control while a request is in flight and ignores Escape", () => {
    render({ isBusy: true });

    for (const control of Array.from(container.querySelectorAll("button"))) expect(control.disabled).toBe(true);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("shows a retryable error without closing", () => {
    render({ hasError: true });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("couldn’t save your answer");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it.each([
    ["fr", "Le ticket nº 7 a été résolu", "Ça a fonctionné", "J’ai toujours le problème"],
    ["es", "El ticket nº 7 se ha resuelto", "Funcionó", "Sigo teniendo el problema"],
    ["pt", "O chamado nº 7 foi resolvido", "Funcionou", "Ainda tenho o problema"],
  ] as const)("is fully translated for %s", (locale, title, worked, stillBroken) => {
    localeMock.locale = locale;
    render();

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(worked);
    expect(container.textContent).toContain(stillBroken);
    expect(container.textContent).not.toContain("Ticket #7");
  });
});
