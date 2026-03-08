import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const { title } = await req.json();
  const note = await prisma.note.create({
    data: { title: title || "無題のノート" },
  });
  return NextResponse.json(note);
}
