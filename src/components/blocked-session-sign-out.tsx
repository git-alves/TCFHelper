"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

/**
 * A deliberately quiet bridge for a session whose local account was blocked.
 * Server pages route it here instead of rendering an explanatory suspension
 * state; clearing Clerk's session also prevents the sign-in callback loop.
 */
export function BlockedSessionSignOut() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/" }).catch(() => {
      // The destination is still safe if a transient Clerk network error
      // prevents immediate session revocation. Protected routes will keep
      // denying the local blocked account on its next request.
      window.location.replace("/");
    });
  }, [signOut]);

  return <main className="flex flex-1" aria-busy="true"><span className="sr-only">Signing out</span></main>;
}
