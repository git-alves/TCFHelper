import { CURRENT_WALKTHROUGH_VERSION } from "@/lib/walkthrough";

export type ContextualWalkthroughPage = "practice" | "tasks";

type WalkthroughStorage = Pick<Storage, "getItem" | "setItem">;

function getStorageKey(page: ContextualWalkthroughPage): string {
  return `mytcflab:contextual-walkthrough:v${CURRENT_WALKTHROUGH_VERSION}:${page}`;
}

/**
 * The Dashboard orientation is durable for the account. These shorter,
 * page-specific guides are deliberately per-browser: they introduce a page
 * when a learner actually chooses to visit it, without navigating them there
 * or adding more account-level onboarding state.
 */
export function shouldShowContextualWalkthrough(
  storage: Pick<WalkthroughStorage, "getItem"> | null,
  page: ContextualWalkthroughPage,
): boolean {
  return storage?.getItem(getStorageKey(page)) !== "seen";
}

export function markContextualWalkthroughSeen(
  storage: Pick<WalkthroughStorage, "setItem"> | null,
  page: ContextualWalkthroughPage,
): void {
  storage?.setItem(getStorageKey(page), "seen");
}

export function getContextualWalkthroughStorage(): WalkthroughStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
