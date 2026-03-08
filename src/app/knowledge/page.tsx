"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface KnowledgeItem {
  id: string;
  subject: string;
  question: string;
  answer: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", question: "", answer: "" });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch("/api/knowledge");
    setItems(await res.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/knowledge/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm({ subject: "", question: "", answer: "" });
    setShowForm(false);
    setEditingId(null);
    fetchItems();
  };

  const startEdit = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setForm({
      subject: item.subject,
      question: item.question,
      answer: item.answer,
    });
    setShowForm(true);
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
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ subject: "", question: "", answer: "" });
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
        >
          + 問題を追加
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        ここに登録した問題と解答は、AI先生が回答する際の参考ナレッジとして活用されます。
      </p>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-5 bg-white rounded-lg border space-y-4"
        >
          <h3 className="font-bold text-sm text-gray-700">
            {editingId ? "ナレッジを編集" : "新しいナレッジを追加"}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              科目
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-300 outline-none"
              placeholder="例: 数学、英語、物理"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              問題
            </label>
            <textarea
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-300 outline-none"
              rows={3}
              placeholder="問題文を入力してください"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              解答・解説
            </label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-300 outline-none"
              rows={4}
              placeholder="模範解答や解説を入力してください"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
            >
              {editingId ? "更新" : "追加"}
            </button>
          </div>
        </form>
      )}

      {/* Items grouped by subject */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">読み込み中...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">&#x1F4DA;</p>
          <p>ナレッジがありません</p>
          <p className="text-sm mt-1">
            問題を追加すると、AI先生がより的確なアドバイスを提供します
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((subject) => (
            <div key={subject}>
              <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                  {subject}
                </span>
                <span className="text-gray-300">
                  ({items.filter((i) => i.subject === subject).length})
                </span>
              </h2>
              <div className="space-y-2">
                {items
                  .filter((i) => i.subject === subject)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-lg border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{item.question}</p>
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">
                        {item.answer}
                      </p>
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
