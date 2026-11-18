import { NextResponse } from "next/server";
import { adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { dismissModelChainAlert } from "@/lib/model-chain";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminApiUser())) return adminNotFoundResponse();
  const { id } = await params;
  if (!/^c[a-z0-9]{24}$/.test(id)) return NextResponse.json({ error: "Invalid alert." }, { status: 400 });
  await dismissModelChainAlert(id);
  return NextResponse.json({ ok: true });
}
