"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  selectedImage: string | null;
  noteTitle: string;
  onClose: () => void;
}

export default function AiTutorPanel({
  selectedImage,
  noteTitle,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  const askAI = async (text: string) => {
    setLoading(true);
    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");

    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          selectedImage,
          noteTitle,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content:
            "エラーが発生しました。ANTHROPIC_API_KEYが設定されているか確認してください。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInitial = () => {
    setHasAsked(true);
    askAI(
      "この部分について教えてください。何が書かれていますか？改善点やアドバイスがあれば教えてください。"
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-amber-50 rounded-t-lg">
        <h3 className="font-bold text-amber-800">
          <span className="mr-1">&#x1F9D1;&#x200D;&#x1F3EB;</span>
          AI先生
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Preview */}
      {selectedImage && (
        <div className="p-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">選択された箇所:</p>
          <img
            src={selectedImage}
            alt="選択箇所"
            className="max-h-32 border rounded bg-white"
          />
          {!hasAsked && (
            <button
              onClick={handleInitial}
              className="mt-2 w-full px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium"
            >
              AI先生に質問する
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && !selectedImage && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-3xl mb-2">&#x1F9D1;&#x200D;&#x1F3EB;</p>
            <p className="text-sm">
              AI投げなわツールで
              <br />
              質問したい箇所を囲んでください
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-gray-500">
              考え中...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {hasAsked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !loading) askAI(input.trim());
          }}
          className="flex gap-2 p-3 border-t"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI先生に質問..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition"
          >
            送信
          </button>
        </form>
      )}
    </div>
  );
}
