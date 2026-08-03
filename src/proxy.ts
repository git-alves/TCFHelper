import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk must see requests for pages and route handlers so `auth()` can
// validate their session. Individual data readers/mutators enforce access
// themselves; that keeps APIs returning their existing JSON 401 responses.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
