import { BlockedSessionSignOut } from "@/components/blocked-session-sign-out";

// This route deliberately says nothing about why the session is being ended.
// It is only a brief client-side bridge that clears Clerk before public
// navigation, preventing a protected-page → login → protected-page loop.
export default function BlockedPage() {
  return <BlockedSessionSignOut />;
}
