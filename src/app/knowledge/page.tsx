"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface KnowledgeItem {
  id: string;
  fileName: string;
  subject: string;
  extractedText: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch("/api/knowledge");
    setItems(await res.json());
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !subject.trim()) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject.trim());

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      setSubject("");
      if (fileRef.current) fileRef.current.value = "";
      fetchItems();
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("このナレッジを削除しますか？")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const subjects = [...new Set(items.map((i) => i.subject))];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            &larr;
          </Link>
          <h1 className="text-2xl font-bold">ナレッジ管理</h1>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        PDFファイルをアップロードすると、AI先生が回答する際の参考資料として活用されます。
        ファイルはGoogleドライブに保存されます。
      </p>

      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="mb-8 p-5 bg-white rounded-lg border space-y-4"
      >
        <h3 className="font-bold text-sm text-gray-700">
          PDFナレッジを追加
        </h3>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              科目
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-300 outline-none"
              placeholder="例: 数学、英語、物理"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              PDFファイル
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-emerald-50 file:text-emerald-700 file:font-medium file:cursor-pointer"
              required
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {uploading ? "アップロード中..." : "アップロード"}
          </button>
        </div>
      </form>

      {/* Items */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">読み込み中...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">&#x1F4DA;</p>
          <p>ナレッジがありません</p>
          <p className="text-sm mt-1">
            PDFを追加すると、AI先生がより的確なアドバイスを提供します
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((subj) => (
            <div key={subj}>
              <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                  {subj}
                </span>
                <span className="text-gray-300">
                  ({items.filter((i) => i.subject === subj).length})
                </span>
              </h2>
              <div className="space-y-2">
                {items
                  .filter((i) => i.subject === subj)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-lg border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            <span className="text-red-500">&#x1F4C4;</span>
                            {item.fileName}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(item.createdAt).toLocaleDateString(
                              "ja-JP"
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>
                      {item.extractedText && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                            抽出テキストを表示
                          </summary>
                          <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {item.extractedText.slice(0, 1000)}
                            {item.extractedText.length > 1000 ? "..." : ""}
                          </p>
                        </details>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
