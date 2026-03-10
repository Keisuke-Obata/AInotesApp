"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import HandwritingCanvas, { Stroke } from "@/components/HandwritingCanvas";
import AiTutorPanel from "@/components/AiTutorPanel";

interface Note {
  id: string;
  title: string;
  strokes: string;
}

export default function NoteEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [note, setNote] = useState<Note | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [title, setTitle] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showTutor, setShowTutor] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setNote(data);
        setTitle(data.title);
        try {
          setStrokes(JSON.parse(data.strokes));
        } catch {
          setStrokes([]);
        }
      });
  }, [id]);

  const save = useCallback(
    async (newStrokes?: Stroke[], newTitle?: string) => {
      setSaving(true);
      await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strokes: newStrokes ?? strokes,
          title: newTitle ?? title,
        }),
      });
      setSaving(false);
    },
    [id, strokes, title]
  );

  const handleStrokesChange = useCallback(
    (s: Stroke[]) => {
      setStrokes(s);
      save(s);
    },
    [save]
  );

  const handleLassoSelect = useCallback((img: string) => {
    setSelectedImage(img);
    setShowTutor(true);
  }, []);

  if (!note)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        読み込み中...
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b bg-white">
        <Link
          href="/notes"
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          &larr;
        </Link>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (note && title !== note.title) save(undefined, title);
          }}
          className="text-xl font-bold flex-1 outline-none bg-transparent"
          placeholder="ノートタイトル"
        />
        <span className="text-xs text-gray-400">
          {saving ? "保存中..." : "保存済み"}
        </span>
      </header>

      <div className="flex-1 flex gap-4 p-4">
        <div className={`${showTutor ? "flex-1" : "w-full"} transition-all`}>
          <HandwritingCanvas
            strokes={strokes}
            onStrokesChange={handleStrokesChange}
            onLassoSelect={handleLassoSelect}
          />
        </div>

        {showTutor && (
          <div className="w-96 flex-shrink-0">
            <AiTutorPanel
              selectedImage={selectedImage}
              noteTitle={title}
              onClose={() => {
                setShowTutor(false);
                setSelectedImage(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
