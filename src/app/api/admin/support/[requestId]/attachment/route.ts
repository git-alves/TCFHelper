import { NextResponse } from "next/server";
import { adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

function downloadFilenameHeader(filename: string) {
  // The ASCII fallback is header-safe; filename* retains a readable Unicode
  // name for clients that support RFC 5987.
  const fallback = filename.replace(/[^A-Za-z0-9._-]/g, "_") || "attachment";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  if (!(await getAdminApiUser())) return adminNotFoundResponse();

  const { requestId } = await params;
  const supportRequest = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: {
      attachment: {
        select: { data: true, mimeType: true, originalName: true },
      },
    },
  });
  const attachment = supportRequest?.attachment;
  if (!attachment) return adminNotFoundResponse();

  return new NextResponse(attachment.data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": attachment.mimeType,
      "Content-Disposition": downloadFilenameHeader(attachment.originalName),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
