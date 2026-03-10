"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface Props {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onLassoSelect: (imageDataUrl: string) => void;
}

type Tool = "pen" | "eraser" | "lasso";

export default function HandwritingCanvas({
  strokes,
  onStrokesChange,
  onLassoSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [penWidth, setPenWidth] = useState(3);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>(
    []
  );

  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        const t = e.touches[0];
        return {
          x: (t.clientX - rect.left) * scaleX,
          y: (t.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const redraw = useCallback(
    (allStrokes: Stroke[], activePts?: { x: number; y: number }[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Saved strokes
      for (const s of allStrokes) {
        if (s.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      }

      // Active drawing
      if (activePts && activePts.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle =
          tool === "eraser"
            ? "#ffffff"
            : tool === "lasso"
              ? "#3b82f6"
              : penColor;
        ctx.lineWidth =
          tool === "eraser" ? 20 : tool === "lasso" ? 2 : penWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (tool === "lasso") ctx.setLineDash([6, 4]);
        ctx.moveTo(activePts[0].x, activePts[0].y);
        for (let i = 1; i < activePts.length; i++) {
          ctx.lineTo(activePts[i].x, activePts[i].y);
        }
        if (tool === "lasso")
          ctx.lineTo(activePts[0].x, activePts[0].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [tool, penColor, penWidth]
  );

  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw]);

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const p = getPoint(e);
      if (tool === "lasso") setLassoPoints([p]);
      else setCurrentPoints([p]);
    },
    [getPoint, tool]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const p = getPoint(e);

      if (tool === "lasso") {
        const pts = [...lassoPoints, p];
        setLassoPoints(pts);
        redraw(strokes, pts);
      } else if (tool === "eraser") {
        const threshold = 20;
        const filtered = strokes.filter(
          (s) =>
            !s.points.some(
              (sp) =>
                Math.abs(sp.x - p.x) < threshold &&
                Math.abs(sp.y - p.y) < threshold
            )
        );
        if (filtered.length !== strokes.length) onStrokesChange(filtered);
      } else {
        const pts = [...currentPoints, p];
        setCurrentPoints(pts);
        redraw(strokes, pts);
      }
    },
    [
      isDrawing,
      getPoint,
      tool,
      lassoPoints,
      currentPoints,
      strokes,
      onStrokesChange,
      redraw,
    ]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === "lasso" && lassoPoints.length > 2) {
      const xs = lassoPoints.map((p) => p.x);
      const ys = lassoPoints.map((p) => p.y);
      const minX = Math.min(...xs),
        minY = Math.min(...ys);
      const maxX = Math.max(...xs),
        maxY = Math.max(...ys);
      const w = maxX - minX,
        h = maxY - minY;

      if (w > 10 && h > 10) {
        const canvas = canvasRef.current;
        if (canvas) {
          redraw(strokes); // clean redraw without lasso
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const imgData = ctx.getImageData(minX, minY, w, h);
            const tmp = document.createElement("canvas");
            tmp.width = w;
            tmp.height = h;
            tmp.getContext("2d")!.putImageData(imgData, 0, 0);
            onLassoSelect(tmp.toDataURL("image/png"));
          }
        }
      }
      setLassoPoints([]);
    } else if (tool === "pen" && currentPoints.length >= 2) {
      onStrokesChange([
        ...strokes,
        { points: currentPoints, color: penColor, width: penWidth },
      ]);
    }

    setCurrentPoints([]);
  }, [
    isDrawing,
    tool,
    lassoPoints,
    currentPoints,
    penColor,
    penWidth,
    strokes,
    onStrokesChange,
    onLassoSelect,
    redraw,
  ]);

  const colors = [
    "#1a1a1a",
    "#dc2626",
    "#2563eb",
    "#16a34a",
    "#9333ea",
    "#ea580c",
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm border flex-wrap">
        <div className="flex gap-1">
          {(["pen", "eraser", "lasso"] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                tool === t
                  ? t === "lasso"
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                    : "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              {t === "pen" ? "ペン" : t === "eraser" ? "消しゴム" : "AI投げなわ"}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {tool === "pen" && (
          <>
            <div className="flex gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    penColor === c
                      ? "border-blue-500 scale-110"
                      : "border-gray-200"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">太さ</span>
              <input
                type="range"
                min={1}
                max={10}
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </>
        )}

        {tool === "lasso" && (
          <p className="text-sm text-amber-600">
            質問したい箇所を囲んでください
          </p>
        )}

        <button
          onClick={() => onStrokesChange([])}
          className="ml-auto px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded transition"
        >
          全消去
        </button>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    </div>
  );
}
