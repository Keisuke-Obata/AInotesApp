import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePdfFromDrive } from "@/lib/google-drive";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.knowledgePdf.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from Google Drive
  try {
    await deletePdfFromDrive(item.driveFileId);
  } catch (e) {
    console.error("Drive delete error:", e);
  }

  await prisma.knowledgePdf.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
