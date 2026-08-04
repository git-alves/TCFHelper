import { describe, expect, it } from "vitest";
import { AUTOMATIC_ADDITIVE_MIGRATIONS } from "./approved-additive-migrations";

describe("AUTOMATIC_ADDITIVE_MIGRATIONS", () => {
  it("allows the nullable generated-topic image migration on existing production databases", () => {
    expect(AUTOMATIC_ADDITIVE_MIGRATIONS).toContain("20260804160000_add_generated_topic_image");
  });
});
