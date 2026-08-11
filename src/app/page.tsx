import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { HomeHero } from "@/components/home-hero";
import { isCurrentRequestBlocked } from "@/lib/blocked-user";

export default async function Home() {
  const [{ userId }, isBlocked] = await Promise.all([
    auth(),
    // A temporary lookup failure must not take down the public marketing
    // page. Protected routes still fail closed through getCurrentAppUser().
    isCurrentRequestBlocked().catch(() => false),
  ]);

  // Keep every verified blocked entry point on the same recovery surface.
  // The modal itself signs out only when the person closes it, after they
  // have had an opportunity to contact support.
  if (isBlocked) redirect("/blocked");

  return <HomeHero isAuthenticated={Boolean(userId)} />;
}
