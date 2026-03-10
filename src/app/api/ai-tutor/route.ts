import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { messages, selectedImage, noteTitle } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Fetch PDF knowledge for context (non-fatal if DB is not ready)
    let knowledgeContext = "";
    try {
      const knowledgeItems = await prisma.knowledgePdf.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { subject: true, fileName: true, extractedText: true },
      });

      if (knowledgeItems.length > 0) {
        knowledgeContext =
          "\n\n【参考ナレッジベース（登録されたPDF資料から抽出）】\n" +
          knowledgeItems
            .map((k) => {
              const text =
                k.extractedText.length > 2000
                  ? k.extractedText.slice(0, 2000) + "..."
                  : k.extractedText;
              return `--- ${k.subject}: ${k.fileName} ---\n${text}`;
            })
            .join("\n\n");
      }
    } catch (dbError) {
      console.warn("Failed to fetch knowledge PDFs (DB may not be migrated):", dbError);
    }

    const systemPrompt = `あなたは優秀なAI先生です。生徒が手書きノートアプリで書いた内容について質問しています。
ノートのタイトル: 「${noteTitle || "無題"}」

以下のルールに従ってください:
- 生徒の理解度に合わせて、分かりやすく丁寧に説明してください
- 間違いがあれば優しく指摘し、正しい解き方を教えてください
- 良い点があれば褒めてください
- 具体的な例を挙げて説明すると効果的です
- ナレッジベースに関連する情報があれば、それを参考にして回答してください
- 日本語で回答してください${knowledgeContext}`;

    // Build Gemini conversation history
    const geminiHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i] as { role: string; content: string };
      geminiHistory.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    const lastMessage = messages[messages.length - 1] as { role: string; content: string };

    const chat = model.startChat({
      systemInstruction: systemPrompt,
      history: geminiHistory,
    });

    // Build the last message parts (with optional image)
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];

    if (lastMessage.role === "user" && messages.length === 1 && selectedImage) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: selectedImage.replace(/^data:image\/png;base64,/, ""),
        },
      });
    }
    parts.push({ text: lastMessage.content });

    const result = await chat.sendMessage(parts);
    const reply = result.response.text() || "応答を取得できませんでした。";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Tutor error:", error);
    const message = error instanceof Error ? error.message : "AI応答の生成に失敗しました";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
