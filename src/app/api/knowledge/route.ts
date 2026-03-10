import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPdfToDrive } from "@/lib/google-drive";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function GET() {
  const items = await prisma.knowledgePdf.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subject = formData.get("subject") as string;

    if (!file || !subject) {
      return NextResponse.json(
        { error: "file and subject are required" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    let extractedText = "";
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch (e) {
      console.error("PDF parse error:", e);
      extractedText = "(テキスト抽出に失敗しました)";
    }

    // Upload to Google Drive
    const driveFileId = await uploadPdfToDrive(file.name, buffer);

    // Save to database
    const item = await prisma.knowledgePdf.create({
      data: {
        fileName: file.name,
        driveFileId,
        subject,
        extractedText,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Knowledge upload error:", error);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
