import { auth } from "@/auth";
import { HomeHero } from "@/components/home-hero";

export default async function Home() {
  const session = await auth();

  return <HomeHero isAuthenticated={Boolean(session)} />;
}
