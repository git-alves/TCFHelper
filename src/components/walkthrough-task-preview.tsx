"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type SelectDefaultTask = () => void;

interface WalkthroughTaskPreviewContextValue {
  register: (selectDefaultTask: SelectDefaultTask | null) => void;
  requestDefaultTask: () => void;
}

const WalkthroughTaskPreviewContext = createContext<WalkthroughTaskPreviewContextValue | null>(null);

// The /tasks tour's topic-picker, editor, and correct-button steps target
// elements that only exist once a task type is selected (see the `{task &&
// ...}` block in WritingWorkspace) -- without this, the Next-button-driven
// tour would advance straight into a step whose target was never rendered
// and silently disappear. Lets TasksWalkthroughRunner ask WritingWorkspace
// to preview a default task the moment the tour opens, without either one
// knowing about the other directly. Mirrors WalkthroughTriggerProvider's
// registration pattern for the same kind of cross-component coordination.
export function WalkthroughTaskPreviewProvider({ children }: { children: ReactNode }) {
  const selectorRef = useRef<SelectDefaultTask | null>(null);

  const register = useCallback((selectDefaultTask: SelectDefaultTask | null) => {
    selectorRef.current = selectDefaultTask;
  }, []);

  const requestDefaultTask = useCallback(() => {
    selectorRef.current?.();
  }, []);

  const value = useMemo(() => ({ register, requestDefaultTask }), [register, requestDefaultTask]);

  return <WalkthroughTaskPreviewContext.Provider value={value}>{children}</WalkthroughTaskPreviewContext.Provider>;
}

export function useWalkthroughTaskPreview(): WalkthroughTaskPreviewContextValue {
  const ctx = useContext(WalkthroughTaskPreviewContext);
  if (!ctx) {
    throw new Error("useWalkthroughTaskPreview must be used within a WalkthroughTaskPreviewProvider");
  }
  return ctx;
}
