"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  title: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch notes");
        return r.json();
      })
      .then(setNotes)
      .catch((e) => console.error("ノート一覧取得エラー:", e))
      .finally(() => setLoading(false));
  }, []);

  const createNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "新しいノート" }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const note = await res.json();
      router.push(`/notes/${note.id}`);
    } catch (e) {
      console.error("ノート作成エラー:", e);
      alert("ノートの作成に失敗しました。もう一度お試しください。");
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("このノートを削除しますか？")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            &larr;
          </Link>
          <h1 className="text-2xl font-bold">ノート一覧</h1>
        </div>
        <button
          onClick={createNote}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + 新しいノート
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">読み込み中...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">&#x1F4DD;</p>
          <p>ノートがありません</p>
          <p className="text-sm mt-1">「新しいノート」を作成してみましょう</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition"
            >
              <Link
                href={`/notes/${note.id}`}
                className="flex-1 font-medium hover:text-blue-600"
              >
                {note.title}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(note.updatedAt).toLocaleDateString("ja-JP")}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-sm text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
