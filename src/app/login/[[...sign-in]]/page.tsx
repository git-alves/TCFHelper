import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isCurrentRequestBlocked } from "@/lib/blocked-user";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // A blocked account still has a valid Clerk cookie. Route it to the one
  // verified recovery modal before mounting SignIn, whose normal signed-in
  // redirect could otherwise return the visitor to a protected callback.
  if (await isCurrentRequestBlocked().catch(() => false)) {
    redirect("/blocked");
  }

  const { callbackUrl } = await searchParams;
  const safeRedirectPath = getSafeRedirectPath(
    typeof callbackUrl === "string" ? callbackUrl : null,
  );

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        fallbackRedirectUrl={safeRedirectPath}
      />
    </main>
  );
}
