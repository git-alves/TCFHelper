// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localeMock = vi.hoisted(() => ({ locale: "en" as "en" | "fr" | "es" | "pt" }));

vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
    // The real Link consumes prefetch; a plain anchor must not receive it.
    const { prefetch, ...rest } = props;
    void prefetch;
    return (
      <a
        href={href}
        onClick={(event) => {
          // A real Link would navigate; the test only records that it was followed.
          event.preventDefault();
          onClick?.(event);
        }}
        {...rest}
      >
        {children}
      </a>
    );
  },
}));

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
const onClose = vi.fn();
const onDecline = vi.fn();
const onOpenSupport = vi.fn();

function render(props: Partial<React.ComponentProps<typeof SupportResolutionModal>> = {}) {
  act(() => {
    root.render(
      <SupportResolutionModal
        notice={notice}
        isBusy={false}
        hasError={false}
        onAnswer={onAnswer}
        onClose={onClose}
        onDecline={onDecline}
        onOpenSupport={onOpenSupport}
        {...props}
      />,
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
  onClose.mockReset();
  onDecline.mockReset();
  onOpenSupport.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SupportResolutionModal", () => {
  it("says which ticket was resolved, shows the admin's note and asks the learner to test, then come back", () => {
    render();

    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Ticket #7 was resolved");
    expect(dialog.textContent).toContain("Test it when you can, then tell us whether it worked.");
    expect(dialog.textContent).toContain("You can close this and answer later from the support icon.");
    expect(dialog.textContent).toContain("Note from support");
    expect(dialog.textContent).toContain("We fixed the editor freezing.");
  });

  it("leaves out the note section when the admin wrote none", () => {
    render({ notice: { ...notice, resolutionNote: null } });

    expect(container.textContent).not.toContain("Note from support");
  });

  it("offers the two answers, the X, a new-ticket link and a discreet decline, and focuses the first answer", () => {
    render();

    expect(Array.from(container.querySelectorAll("button")).map((b) => b.textContent || b.getAttribute("aria-label"))).toEqual([
      "Close",
      "It worked",
      "I still have the problem",
      "I don’t want to answer",
    ]);
    const link = container.querySelector("a")!;
    expect(link.textContent).toBe("Open a new ticket");
    expect(link.getAttribute("href")).toBe("/support");
    expect(document.activeElement).toBe(button("It worked"));
  });

  it('"It worked" and "I still have the problem" report their own answer and nothing else', () => {
    render();

    act(() => button("It worked").click());
    expect(onAnswer).toHaveBeenLastCalledWith("WORKED");
    act(() => button("I still have the problem").click());
    expect(onAnswer).toHaveBeenLastCalledWith("STILL_BROKEN");
    expect(onAnswer).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("the X only closes (answer later): it neither answers nor declines", () => {
    render();

    act(() => button("Close").click());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("Escape behaves like the X: it closes without declining", () => {
    render();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('"I don\'t want to answer" declines, and does not close, answer or open support', () => {
    render();

    act(() => button("I don’t want to answer").click());

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(onAnswer).not.toHaveBeenCalled();
    expect(onOpenSupport).not.toHaveBeenCalled();
  });

  it("the new-ticket link goes to /support and closes the modal without declining or answering", () => {
    render();

    act(() => {
      (container.querySelector("a") as HTMLAnchorElement).click();
    });

    expect(onOpenSupport).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("clicking the backdrop does nothing", () => {
    render();

    act(() => {
      (container.firstElementChild as HTMLElement).click();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("disables every button while a request is in flight and ignores Escape", () => {
    render({ isBusy: true });

    for (const control of Array.from(container.querySelectorAll("button"))) expect(control.disabled).toBe(true);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a retryable error without closing", () => {
    render({ hasError: true });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("couldn’t save your answer");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it.each([
    ["fr", "Le ticket nº 7 a été résolu", "Ça a fonctionné", "J’ai toujours le problème", "Je ne souhaite pas répondre", "Ouvrir un nouveau ticket", "répondre plus tard"],
    ["es", "El ticket nº 7 se ha resuelto", "Funcionó", "Sigo teniendo el problema", "No quiero responder", "Abrir un nuevo ticket", "responder más tarde"],
    ["pt", "O chamado nº 7 foi resolvido", "Funcionou", "Ainda tenho o problema", "Não quero responder", "Abrir um novo chamado", "responder depois pelo ícone de suporte"],
  ] as const)("is fully translated for %s", (locale, title, worked, stillBroken, decline, newTicket, later) => {
    localeMock.locale = locale;
    render();

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(worked);
    expect(container.textContent).toContain(stillBroken);
    expect(container.textContent).toContain(decline);
    expect(container.textContent).toContain(newTicket);
    expect(container.textContent).toContain(later);
    expect(container.textContent).not.toContain("Ticket #7");
    expect(container.textContent).not.toContain("answer later");
  });
});
