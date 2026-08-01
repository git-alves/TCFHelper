import { SignUp } from "@clerk/nextjs";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

interface SignupPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { callbackUrl } = await searchParams;
  const safeRedirectPath = getSafeRedirectPath(
    typeof callbackUrl === "string" ? callbackUrl : null,
  );

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        fallbackRedirectUrl={safeRedirectPath}
      />
    </main>
  );
}
