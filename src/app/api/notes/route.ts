import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch (e) {
    console.error("Notes fetch error:", e);
    return NextResponse.json(
      { error: "ノートの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    const note = await prisma.note.create({
      data: { title: title || "無題のノート" },
    });
    return NextResponse.json(note);
  } catch (e) {
    console.error("Note creation error:", e);
    return NextResponse.json(
      { error: "ノートの作成に失敗しました" },
      { status: 500 }
    );
  }
}
