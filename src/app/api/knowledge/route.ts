import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.knowledge.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { subject, question, answer } = await req.json();
  if (!subject || !question || !answer) {
    return NextResponse.json(
      { error: "subject, question, answer are required" },
      { status: 400 }
    );
  }
  const item = await prisma.knowledge.create({
    data: { subject, question, answer },
  });
  return NextResponse.json(item);
}
