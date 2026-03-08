import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { messages, selectedImage, noteTitle } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Fetch knowledge base for context
    const knowledgeItems = await prisma.knowledge.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
    });

    let knowledgeContext = "";
    if (knowledgeItems.length > 0) {
      knowledgeContext =
        "\n\n【参考ナレッジベース】\n" +
        knowledgeItems
          .map(
            (k) =>
              `- 科目: ${k.subject}\n  問題: ${k.question}\n  解答: ${k.answer}`
          )
          .join("\n");
    }

    const systemPrompt = `あなたは優秀なAI先生です。生徒が手書きノートアプリで書いた内容について質問しています。
ノートのタイトル: 「${noteTitle || "無題"}」

以下のルールに従ってください:
- 生徒の理解度に合わせて、分かりやすく丁寧に説明してください
- 間違いがあれば優しく指摘し、正しい解き方を教えてください
- 良い点があれば褒めてください
- 具体的な例を挙げて説明すると効果的です
- 日本語で回答してください${knowledgeContext}`;

    // Build messages for Claude API
    const claudeMessages: Anthropic.MessageParam[] = messages.map(
      (msg: { role: string; content: string }, index: number) => {
        if (msg.role === "user" && index === 0 && selectedImage) {
          // First user message includes the image
          return {
            role: "user" as const,
            content: [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: "image/png" as const,
                  data: selectedImage.replace(/^data:image\/png;base64,/, ""),
                },
              },
              { type: "text" as const, text: msg.content },
            ],
          };
        }
        return {
          role: msg.role as "user" | "assistant",
          content: msg.content,
        };
      }
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "応答を取得できませんでした。";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Tutor error:", error);
    return NextResponse.json(
      { error: "AI応答の生成に失敗しました" },
      { status: 500 }
    );
  }
}
