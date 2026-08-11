import { describe, expect, it } from "vitest";
import { parsePositiveIntegerFormValue } from "./access-code-limits";

describe("parsePositiveIntegerFormValue", () => {
  it("accepts a plain positive integer within range", () => {
    expect(parsePositiveIntegerFormValue("30", 100)).toBe(30);
  });

  it("correctly reads exponent notation instead of parseInt's silent truncation to 1", () => {
    expect(parsePositiveIntegerFormValue("1e1", 100)).toBe(10);
  });

  it("rejects a fractional value instead of parseInt's silent truncation to 30", () => {
    expect(parsePositiveIntegerFormValue("30.5", 100)).toBeNull();
  });

  it("rejects zero", () => {
    expect(parsePositiveIntegerFormValue("0", 100)).toBeNull();
  });

  it("rejects a negative value", () => {
    expect(parsePositiveIntegerFormValue("-5", 100)).toBeNull();
  });

  it("rejects a value above the given maximum", () => {
    expect(parsePositiveIntegerFormValue("101", 100)).toBeNull();
  });

  it("accepts a value exactly at the given maximum", () => {
    expect(parsePositiveIntegerFormValue("100", 100)).toBe(100);
  });

  it("rejects an empty string", () => {
    expect(parsePositiveIntegerFormValue("", 100)).toBeNull();
  });

  it("rejects non-numeric text", () => {
    expect(parsePositiveIntegerFormValue("abc", 100)).toBeNull();
  });
});
