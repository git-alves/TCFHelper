"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

export interface WalkthroughScriptHandlers {
  // Called every time the /tasks tour's active step changes. WritingWorkspace
  // owns what each step id actually does (select a task, fetch a topic,
  // paste sample text, show the canned correction preview) -- the runner
  // just announces which step is now active.
  applyStep: (stepId: string) => void;
  // Called once, when the tour closes (skip or finish). Only meaningful if
  // applyStep actually ran the scripted demo (see the guard in
  // WritingWorkspace) -- otherwise there is nothing tour-authored to discard.
  resetDemo: () => void;
}

interface WalkthroughWorkspaceScriptContextValue {
  register: (handlers: WalkthroughScriptHandlers | null) => void;
  applyStep: (stepId: string) => void;
  resetDemo: () => void;
}

const WalkthroughWorkspaceScriptContext = createContext<WalkthroughWorkspaceScriptContextValue | null>(null);

// The /tasks tour drives real workspace state instead of just pointing at
// it -- selecting a task, fetching a topic, pasting a sample response, and
// showing a canned correction preview -- so several of its steps target
// elements that only exist once an earlier step's action has actually run
// (see the `{task && ...}` block in WritingWorkspace). Lets
// TasksWalkthroughRunner announce step changes to WritingWorkspace without
// either one knowing about the other directly. Mirrors
// WalkthroughTriggerProvider's registration pattern for the same kind of
// cross-component coordination.
export function WalkthroughWorkspaceScriptProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<WalkthroughScriptHandlers | null>(null);
  // TasksWalkthroughRunner and WritingWorkspace are siblings, and React
  // fires a component's own effects before its later siblings' -- since
  // the runner is rendered first (see WalkthroughWorkspaceScriptProvider's
  // usage in app/tasks/page.tsx), an auto-starting tour's very first
  // applyStep("task-picker") call can land here before WritingWorkspace's
  // registration effect has run at all, on the very first commit. Without
  // buffering, that call would just be silently dropped (handlersRef still
  // null), and since nothing else re-announces the same step, the tour's
  // very first action -- the one every later step's target depends on --
  // would simply never happen. Buffering the most recent request and
  // replaying it the moment a real handler registers makes this correct
  // regardless of which order the two actually mount in.
  const pendingStepIdRef = useRef<string | null>(null);

  const register = useCallback((handlers: WalkthroughScriptHandlers | null) => {
    handlersRef.current = handlers;
    if (handlers && pendingStepIdRef.current !== null) {
      const stepId = pendingStepIdRef.current;
      pendingStepIdRef.current = null;
      handlers.applyStep(stepId);
    }
  }, []);

  const applyStep = useCallback((stepId: string) => {
    if (handlersRef.current) {
      handlersRef.current.applyStep(stepId);
    } else {
      pendingStepIdRef.current = stepId;
    }
  }, []);

  const resetDemo = useCallback(() => {
    pendingStepIdRef.current = null;
    handlersRef.current?.resetDemo();
  }, []);

  const value = useMemo(() => ({ register, applyStep, resetDemo }), [register, applyStep, resetDemo]);

  return (
    <WalkthroughWorkspaceScriptContext.Provider value={value}>{children}</WalkthroughWorkspaceScriptContext.Provider>
  );
}

export function useWalkthroughWorkspaceScript(): WalkthroughWorkspaceScriptContextValue {
  const ctx = useContext(WalkthroughWorkspaceScriptContext);
  if (!ctx) {
    throw new Error("useWalkthroughWorkspaceScript must be used within a WalkthroughWorkspaceScriptProvider");
  }
  return ctx;
}
