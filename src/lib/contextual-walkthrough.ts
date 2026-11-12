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
  try {
    return storage?.getItem(getStorageKey(page)) !== "seen";
  } catch {
    // Unreadable storage: show the guide rather than fail.
    return true;
  }
}

export function markContextualWalkthroughSeen(
  storage: Pick<WalkthroughStorage, "setItem"> | null,
  page: ContextualWalkthroughPage,
): void {
  try {
    storage?.setItem(getStorageKey(page), "seen");
  } catch {
    // The guide may show again next visit; that is better than an error.
  }
}

export function getContextualWalkthroughStorage(): WalkthroughStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
