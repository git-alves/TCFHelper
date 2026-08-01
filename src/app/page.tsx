import { auth } from "@clerk/nextjs/server";
import { HomeHero } from "@/components/home-hero";

export default async function Home() {
  const { userId } = await auth();

  return <HomeHero isAuthenticated={Boolean(userId)} />;
}
