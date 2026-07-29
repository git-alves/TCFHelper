import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./safe-redirect";

describe("getSafeRedirectPath", () => {
  it("passes through a plain same-origin path", () => {
    expect(getSafeRedirectPath("/dashboard")).toBe("/dashboard");
  });

  it("preserves search and hash on a same-origin path", () => {
    expect(getSafeRedirectPath("/essays/123?tab=feedback#top")).toBe(
      "/essays/123?tab=feedback#top"
    );
  });

  it("falls back for null/empty input", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath("")).toBe("/dashboard");
  });

  it("falls back for protocol-relative paths", () => {
    expect(getSafeRedirectPath("//evil.example")).toBe("/dashboard");
  });

  it("falls back for absolute URLs to another origin", () => {
    expect(getSafeRedirectPath("http://evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("https://evil.example/path")).toBe("/dashboard");
  });

  it("falls back for backslash-variant protocol-relative paths", () => {
    expect(getSafeRedirectPath("/\\evil.example")).toBe("/dashboard");
  });

  it("falls back for a control-character payload that decodes to a protocol-relative path", () => {
    // Regression: "/\r\n//evil.example" starts with "/" and not "//", so a
    // naive prefix check let it through, but the WHATWG URL parser strips
    // the CR/LF and reinterprets it as "//evil.example" (a different
    // origin) — exactly what a browser does when the value reaches an
    // href/router.push call.
    expect(getSafeRedirectPath("/\r\n//evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\r/evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\n//evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\t/evil.example")).toBe("/dashboard");
  });

  it("uses a custom fallback when provided", () => {
    expect(getSafeRedirectPath("//evil.example", "/login")).toBe("/login");
  });
});
