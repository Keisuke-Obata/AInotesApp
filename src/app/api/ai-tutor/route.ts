import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { messages, selectedImage, noteTitle } = await req.json();

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "HUGGINGFACE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const client = new HfInference(apiKey);

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

    // Build conversation for HuggingFace
    let conversationText = systemPrompt + "\n\n";

    for (const msg of messages) {
      const role = msg.role === "assistant" ? "Assistant" : "User";
      conversationText += `${role}: ${msg.content}\n`;
    }

    conversationText += "Assistant: ";

    // Handle image if present in the first message
    let imageUrl: string | undefined;
    if (selectedImage && messages.length > 0 && messages[0].role === "user") {
      imageUrl = selectedImage;
    }

    // Use text generation model with context about the image
    const response = await client.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      inputs: conversationText,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
      },
    });

    const reply = response.generated_text
      ? response.generated_text.split("Assistant: ").pop()?.trim() || "応答を取得できませんでした。"
      : "応答を取得できませんでした。";

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
