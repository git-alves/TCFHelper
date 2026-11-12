// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeLocalStorage, installUnreachableLocalStorage } from "./draft-autosave.test-helpers";
import { getSafeLocalStorage, safeGetLocalItem, safeSetLocalItem } from "./safe-storage";

let restore: (() => void) | undefined;
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  restore?.();
  restore = undefined;
});

describe("safe storage", () => {
  it("reads and writes normally when storage works", () => {
    expect(safeSetLocalItem("k", "v")).toBe(true);
    expect(safeGetLocalItem("k")).toBe("v");
    expect(safeGetLocalItem("missing")).toBeNull();
    getSafeLocalStorage().removeItem("k");
    expect(safeGetLocalItem("k")).toBeNull();
  });

  it("reports nothing stored, and never throws, when every call throws", () => {
    restore = installFakeLocalStorage({ failReads: true, failWrites: true }).restore;

    expect(safeGetLocalItem("k")).toBeNull();
    expect(safeSetLocalItem("k", "v")).toBe(false);
    expect(() => getSafeLocalStorage().removeItem("k")).not.toThrow();
  });

  it("reports nothing stored, and never throws, when reaching window.localStorage throws", () => {
    const blocked = installUnreachableLocalStorage();
    restore = blocked.restore;

    expect(safeGetLocalItem("k")).toBeNull();
    expect(safeSetLocalItem("k", "v")).toBe(false);
    const stand = getSafeLocalStorage();
    expect(stand.getItem("k")).toBeNull();
    expect(() => stand.setItem("k", "v")).not.toThrow();
    expect(() => stand.removeItem("k")).not.toThrow();
    expect(blocked.accesses()).toBeGreaterThan(0);
  });
});
