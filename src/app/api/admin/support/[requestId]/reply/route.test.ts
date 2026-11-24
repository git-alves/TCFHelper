import { beforeEach, describe, expect, it, vi } from "vitest";
const { adminMock, editMock } = vi.hoisted(() => ({ adminMock: vi.fn(), editMock: vi.fn() }));
vi.mock("@/lib/admin-api", () => ({ getAdminApiUser: adminMock, adminNotFoundResponse: () => new Response(null,{status:404}), adminJsonResponse:(body:unknown,status=200)=>new Response(JSON.stringify(body),{status}) }));
vi.mock("@/lib/support-resolution", () => ({ SUPPORT_RESOLUTION_NOTE_MAX_CHARS: 500, editSupportResolutionNote: editMock }));
const { PATCH } = await import("./route");
const call = (body: unknown) => PATCH(new Request("http://x",{method:"PATCH",body:JSON.stringify(body)}),{params:Promise.resolve({requestId:"req_1"})});
beforeEach(()=>{adminMock.mockReset();editMock.mockReset();adminMock.mockResolvedValue({id:"owner"});editMock.mockResolvedValue({kind:"updated"});});
describe("PATCH reply",()=>{
 it("rejects non-admin",async()=>{adminMock.mockResolvedValue(null);expect((await call({note:"x"})).status).toBe(404);});
 it("validates empty and over-limit notes",async()=>{expect((await call({note:""})).status).toBe(400);expect((await call({note:"x".repeat(501)})).status).toBe(400);});
 it("returns conflict after learner interaction",async()=>{editMock.mockResolvedValue({kind:"notEditable"});const r=await call({note:"x"});expect(r.status).toBe(409);});
 it("updates a trimmed note",async()=>{const r=await call({note:" x "});expect(r.status).toBe(200);expect(editMock).toHaveBeenCalledWith("req_1","x");});
});
