import { auth } from "@clerk/nextjs/server";
import { BlockedSessionSignOut } from "@/components/blocked-session-sign-out";
import { HomeHero } from "@/components/home-hero";
import { isCurrentRequestBlocked } from "@/lib/blocked-user";

export default async function Home() {
  const [{ userId }, isBlocked] = await Promise.all([
    auth(),
    // A temporary lookup failure must not take down the public marketing
    // page. Protected routes still fail closed through getCurrentAppUser().
    isCurrentRequestBlocked().catch(() => false),
  ]);

  if (isBlocked) return <BlockedSessionSignOut />;

  return <HomeHero isAuthenticated={Boolean(userId)} />;
}
