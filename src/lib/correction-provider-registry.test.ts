import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getCorrectionProvider } = await import("./correction-provider-registry");

describe("getCorrectionProvider", () => {
  it("resolves the gemini adapter", () => {
    expect(getCorrectionProvider("gemini").id).toBe("gemini");
  });

  it("resolves the openrouter adapter", () => {
    expect(getCorrectionProvider("openrouter").id).toBe("openrouter");
  });
});
