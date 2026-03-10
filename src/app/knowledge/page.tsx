"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface KnowledgeItem {
  id: string;
  fileName: string;
  subject: string;
  extractedText: string;
  createdAt: string;
}

interface SyncResult {
  added: number;
  removed: number;
  total: number;
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/knowledge");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      console.error("ナレッジ取得エラー");
    } finally {
      setLoading(false);
    }
  };

  const syncFromDrive = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/knowledge", { method: "POST" });
      if (!res.ok) throw new Error();
      const result: SyncResult = await res.json();
      setSyncResult(result);
      await fetchItems();
    } catch {
      alert("同期に失敗しました。Google Drive の設定を確認してください。");
    } finally {
      setSyncing(false);
    }
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
        <button
          onClick={syncFromDrive}
          disabled={syncing}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {syncing ? "同期中..." : "Google Drive と同期"}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Google
        ドライブの指定フォルダにサブフォルダ（科目名）を作り、PDFを追加してください。
        「同期」ボタンで自動的に取り込まれます。
      </p>

      {syncResult && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
          同期完了: {syncResult.added}件追加 / {syncResult.removed}件削除 /
          合計{syncResult.total}件
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-12">読み込み中...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">&#x1F4DA;</p>
          <p>ナレッジがありません</p>
          <p className="text-sm mt-1">
            Google
            ドライブにPDFを追加して「同期」ボタンを押してください
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
