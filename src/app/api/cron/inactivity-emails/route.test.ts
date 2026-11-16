import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const run = vi.fn();
vi.mock("@/lib/inactivity-emails", () => ({ runInactivityEmailCron: run }));
const { GET } = await import("./route");
const request = (authorization?: string) => new NextRequest("http://localhost/api/cron/inactivity-emails", { headers: authorization ? { authorization } : {} });
beforeEach(() => { vi.stubEnv("CRON_SECRET", "secret"); run.mockReset(); run.mockResolvedValue({ sent: 0, skipped: "off" }); });
afterEach(() => vi.unstubAllEnvs());
describe("GET /api/cron/inactivity-emails", () => {
  it("rejects missing credentials and does not invoke the sender", async () => { expect((await GET(request())).status).toBe(401); expect(run).not.toHaveBeenCalled(); });
  it("runs only with the Vercel bearer token", async () => { expect((await GET(request("Bearer secret"))).status).toBe(200); expect(run).toHaveBeenCalledOnce(); });
});
