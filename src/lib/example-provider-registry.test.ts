import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getExampleProvider } = await import("./example-provider-registry");

describe("getExampleProvider", () => {
  it("resolves the gemini adapter", () => {
    expect(getExampleProvider("gemini").id).toBe("gemini");
  });

  it("resolves the openrouter adapter", () => {
    expect(getExampleProvider("openrouter").id).toBe("openrouter");
  });
});
