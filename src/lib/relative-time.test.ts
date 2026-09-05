import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-09-05T12:00:00.000Z").getTime();

describe("formatRelativeTime", () => {
  it("reports under a minute as just now", () => {
    expect(formatRelativeTime("2026-09-05T11:59:31.000Z", NOW)).toBe("just now");
  });

  it("reports minutes", () => {
    expect(formatRelativeTime("2026-09-05T11:45:00.000Z", NOW)).toBe("15 min ago");
  });

  it("reports hours, singular and plural", () => {
    expect(formatRelativeTime("2026-09-05T11:00:00.000Z", NOW)).toBe("1 hr ago");
    expect(formatRelativeTime("2026-09-05T09:00:00.000Z", NOW)).toBe("3 hrs ago");
  });

  it("reports days, singular and plural", () => {
    expect(formatRelativeTime("2026-09-04T12:00:00.000Z", NOW)).toBe("1 day ago");
    expect(formatRelativeTime("2026-09-01T12:00:00.000Z", NOW)).toBe("4 days ago");
  });
});
