// A Clerk publishable key encodes its Frontend API host as
// base64(`<host>$`) after the `pk_test_`/`pk_live_` prefix (see
// @clerk/shared's parsePublishableKey). Decoding it lets the CSP allow
// exactly this deployment's Clerk instance -- dev or prod, whichever key is
// configured at build time -- without hardcoding an environment-specific
// domain.
export function clerkFrontendApiOrigin(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.split("_")[2];
  if (!encoded) return null;
  try {
    const host = Buffer.from(encoded, "base64").toString("utf-8").replace(/\$$/, "");
    return host ? `https://${host}` : null;
  } catch {
    return null;
  }
}

// Clerk's CSP guide (clerk.com/docs/guides/secure/best-practices/csp-headers)
// asks for its Frontend API host plus its Cloudflare bot-check and
// fraud-protection hosts on script-src/connect-src/frame-src, and
// 'unsafe-inline' on style-src for its runtime CSS-in-JS. script-src also
// needs 'unsafe-inline' for the inline dark-mode bootstrap script in
// app/layout.tsx (THEME_INIT_SCRIPT) and, short of a nonce-based proxy
// forcing every route into dynamic rendering, for Next's own App Router
// hydration scripts.
export function buildContentSecurityPolicy({
  clerkOrigin,
  isDev,
}: {
  clerkOrigin: string | null;
  isDev: boolean;
}): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.protect.clerk.com${clerkOrigin ? ` ${clerkOrigin}` : ""}${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' https://*.protect.clerk.com:*${clerkOrigin ? ` ${clerkOrigin}` : ""}`,
    "img-src 'self' data: blob: https://img.clerk.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com https://*.protect.clerk.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function buildSecurityHeaders(csp: string): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Superseded by CSP's frame-ancestors above for modern browsers, but kept
    // for older ones per Next's own header guidance.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ];
}
