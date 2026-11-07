// @vitest-environment happy-dom
//
// The "Get a random topic" button's result states. An empty bank (no topics
// seeded for the task) is permanent until someone seeds it, so it must not be
// reported as a transient failure that asks the learner to retry.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { DashboardNavGuardProvider } from "@/components/dashboard-nav-guard";
import { WalkthroughWorkspaceScriptProvider } from "@/components/walkthrough-workspace-script";
import { WritingWorkspace } from "@/components/writing-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let topicResponse: () => Response;
let requestedUrls: string[];
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  requestedUrls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return topicResponse();
    }),
  );
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

async function pressRandomTopic() {
  act(() => {
    root.render(
      <AppLocaleProvider initialLocale="en">
        <DashboardNavGuardProvider>
          <WalkthroughWorkspaceScriptProvider>
            <WritingWorkspace />
          </WalkthroughWorkspaceScriptProvider>
        </DashboardNavGuardProvider>
      </AppLocaleProvider>,
    );
  });
  // Pick Tâche 1 by hand: driving this through the app tour would mark the
  // tour active, and a failed fetch during the tour is deliberately papered
  // over with a scripted topic instead of showing the error under test.
  const taskCard = container.querySelector('[data-walkthrough="task-picker"] button');
  if (!(taskCard instanceof HTMLButtonElement)) throw new Error("task card not found");
  act(() => {
    taskCard.click();
  });

  const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Get a random topic"));
  if (!button) throw new Error("random topic button not found");
  await act(async () => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const alertText = () => container.querySelector('[role="alert"]')?.textContent ?? "";

describe("Get a random topic", () => {
  it("asks the random-topic endpoint, not an outside source", async () => {
    topicResponse = () => ({ ok: false, json: async () => ({}) }) as Response;

    await pressRandomTopic();

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toMatch(/^\/api\/topics\/random\?taskType=TASK_\d$/);
  });

  it("says no topics exist yet, instead of asking to retry, when the bank is empty", async () => {
    topicResponse = () =>
      ({ ok: false, status: 404, json: async () => ({ code: "NO_TOPICS_AVAILABLE" }) }) as unknown as Response;

    await pressRandomTopic();

    expect(alertText()).toContain("We don't have any topics for this task yet");
    expect(alertText()).not.toMatch(/try again/i);
  });

  it("still suggests retrying for an ordinary failure", async () => {
    topicResponse = () => ({ ok: false, status: 500, json: async () => ({ error: "boom" }) }) as unknown as Response;

    await pressRandomTopic();

    expect(alertText()).toMatch(/try again/i);
    expect(alertText()).not.toContain("We don't have any topics");
  });
});
