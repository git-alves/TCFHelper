import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders, clerkFrontendApiOrigin } from "./security-headers";

describe("clerkFrontendApiOrigin", () => {
  it("decodes the Frontend API host from a publishable key", () => {
    // pk_test_<base64("humble-quail-42.clerk.accounts.dev$")>
    const key = `pk_test_${Buffer.from("humble-quail-42.clerk.accounts.dev$").toString("base64")}`;
    expect(clerkFrontendApiOrigin(key)).toBe("https://humble-quail-42.clerk.accounts.dev");
  });

  it("decodes a production key's custom Frontend API domain", () => {
    const key = `pk_live_${Buffer.from("clerk.example.com$").toString("base64")}`;
    expect(clerkFrontendApiOrigin(key)).toBe("https://clerk.example.com");
  });

  it("returns null when no key is configured", () => {
    expect(clerkFrontendApiOrigin(undefined)).toBeNull();
  });

  it("returns null for a malformed key rather than throwing", () => {
    expect(clerkFrontendApiOrigin("not-a-real-key")).toBeNull();
  });
});

describe("buildContentSecurityPolicy", () => {
  it("allows the resolved Clerk origin on script-src and connect-src", () => {
    const csp = buildContentSecurityPolicy({ clerkOrigin: "https://clerk.example.com", isDev: false });

    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.protect.clerk.com https://clerk.example.com");
    expect(csp).toContain("connect-src 'self' https://*.protect.clerk.com:* https://clerk.example.com");
  });

  it("omits 'unsafe-eval' in production", () => {
    const csp = buildContentSecurityPolicy({ clerkOrigin: null, isDev: false });
    expect(csp).not.toContain("unsafe-eval");
  });

  it("adds 'unsafe-eval' only in development, for React's debug eval", () => {
    const csp = buildContentSecurityPolicy({ clerkOrigin: null, isDev: true });
    expect(csp).toContain("'unsafe-eval'");
  });

  it("blocks framing by default", () => {
    const csp = buildContentSecurityPolicy({ clerkOrigin: null, isDev: false });
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("buildSecurityHeaders", () => {
  it("includes the standard hardening headers alongside the given CSP", () => {
    const headers = buildSecurityHeaders("default-src 'self'");
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["Content-Security-Policy"]).toBe("default-src 'self'");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Strict-Transport-Security"]).toContain("max-age=");
  });
});
