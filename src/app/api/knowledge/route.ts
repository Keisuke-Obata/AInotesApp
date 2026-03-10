import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listPdfsInFolder, downloadPdfFromDrive } from "@/lib/google-drive";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function GET() {
  try {
    const items = await prisma.knowledgePdf.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("Knowledge fetch error:", e);
    return NextResponse.json(
      { error: "ナレッジの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/** POST = Sync from Google Drive folder */
export async function POST() {
  try {
    // 1. List PDFs in Drive subfolders
    const driveFiles = await listPdfsInFolder();

    // 2. Get existing driveFileIds from DB
    const existing = await prisma.knowledgePdf.findMany({
      select: { driveFileId: true },
    });
    const existingIds = new Set(existing.map((e) => e.driveFileId));

    // 3. Find new files to sync
    const newFiles = driveFiles.filter((f) => !existingIds.has(f.id));

    // 4. Find removed files (in DB but no longer in Drive)
    const driveIds = new Set(driveFiles.map((f) => f.id));
    const removedIds = existing
      .filter((e) => !driveIds.has(e.driveFileId))
      .map((e) => e.driveFileId);

    // 5. Download, extract text, and save new files
    const added: string[] = [];
    for (const file of newFiles) {
      let extractedText = "";
      try {
        const buffer = await downloadPdfFromDrive(file.id);
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } catch (e) {
        console.error(`PDF parse error for ${file.name}:`, e);
        extractedText = "(テキスト抽出に失敗しました)";
      }

      await prisma.knowledgePdf.create({
        data: {
          fileName: file.name,
          driveFileId: file.id,
          subject: file.subject,
          extractedText,
        },
      });
      added.push(file.name);
    }

    // 6. Remove DB entries for files deleted from Drive
    if (removedIds.length > 0) {
      await prisma.knowledgePdf.deleteMany({
        where: { driveFileId: { in: removedIds } },
      });
    }

    return NextResponse.json({
      added: added.length,
      removed: removedIds.length,
      total: driveFiles.length,
    });
  } catch (error) {
    console.error("Knowledge sync error:", error);
    return NextResponse.json(
      { error: "同期に失敗しました" },
      { status: 500 }
    );
  }
}
