import { SignIn } from "@clerk/nextjs";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
