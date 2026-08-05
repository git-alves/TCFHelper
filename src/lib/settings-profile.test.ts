import { describe, expect, it } from "vitest";
import { resolveSettingsProfile } from "./settings-profile";

const local = { name: "Local Name", email: "local@example.com" };

describe("resolveSettingsProfile", () => {
  it("prefers Clerk's name and email over the local record", () => {
    const profile = resolveSettingsProfile(local, {
      fullName: "Clerk Name",
      primaryEmail: "clerk@example.com",
      hasImage: true,
      imageUrl: "https://img.clerk.com/avatar.png",
    });

    expect(profile).toEqual({
      name: "Clerk Name",
      email: "clerk@example.com",
      avatarUrl: "https://img.clerk.com/avatar.png",
    });
  });

  it("falls back to the local name when Clerk has none", () => {
    const profile = resolveSettingsProfile(local, {
      fullName: null,
      primaryEmail: "clerk@example.com",
      hasImage: false,
      imageUrl: "",
    });

    expect(profile.name).toBe("Local Name");
    expect(profile.email).toBe("clerk@example.com");
  });

  it("falls back to the local name when Clerk's is blank", () => {
    const profile = resolveSettingsProfile(local, {
      fullName: "   ",
      primaryEmail: "clerk@example.com",
      hasImage: false,
      imageUrl: "",
    });

    expect(profile.name).toBe("Local Name");
  });

  it("falls back to the local email when Clerk has none", () => {
    const profile = resolveSettingsProfile(local, {
      fullName: "Clerk Name",
      primaryEmail: null,
      hasImage: false,
      imageUrl: "",
    });

    expect(profile.email).toBe("local@example.com");
  });

  it("falls back entirely to the local profile when there is no Clerk profile", () => {
    const profile = resolveSettingsProfile(local, null);

    expect(profile).toEqual({ name: "Local Name", email: "local@example.com", avatarUrl: null });
  });

  it("never returns an avatar when Clerk reports no image, even with a name and email", () => {
    const profile = resolveSettingsProfile(local, {
      fullName: "Clerk Name",
      primaryEmail: "clerk@example.com",
      hasImage: false,
      imageUrl: "https://img.clerk.com/stale.png",
    });

    expect(profile.avatarUrl).toBeNull();
  });
});
