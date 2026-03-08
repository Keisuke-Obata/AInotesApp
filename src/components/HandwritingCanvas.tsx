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
  onLassoSelect: (imageDataUrl: string, bounds: DOMRect) => void;
}

type Tool = "pen" | "eraser" | "lasso";

export default function HandwritingCanvas({
  strokes,
  onStrokesChange,
  onLassoSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{
    x: number;
    y: number;
  }[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [penWidth, setPenWidth] = useState(3);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>(
    []
  );

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const redrawCanvas = useCallback(
    (allStrokes: Stroke[], currentPts?: { x: number; y: number }[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
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

      // Draw strokes
      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }

      // Draw current stroke
      if (currentPts && currentPts.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle =
          tool === "eraser" ? "#ffffff" : tool === "lasso" ? "#3b82f6" : penColor;
        ctx.lineWidth = tool === "eraser" ? 20 : tool === "lasso" ? 2 : penWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (tool === "lasso") {
          ctx.setLineDash([6, 4]);
        }
        ctx.moveTo(currentPts[0].x, currentPts[0].y);
        for (let i = 1; i < currentPts.length; i++) {
          ctx.lineTo(currentPts[i].x, currentPts[i].y);
        }
        if (tool === "lasso") {
          ctx.lineTo(currentPts[0].x, currentPts[0].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [tool, penColor, penWidth]
  );

  useEffect(() => {
    redrawCanvas(strokes);
  }, [strokes, redrawCanvas]);

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const point = getCanvasPoint(e);
      if (tool === "lasso") {
        setLassoPoints([point]);
      } else {
        setCurrentStroke([point]);
      }
    },
    [getCanvasPoint, tool]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getCanvasPoint(e);

      if (tool === "lasso") {
        const newLasso = [...lassoPoints, point];
        setLassoPoints(newLasso);
        redrawCanvas(strokes, newLasso);
      } else if (tool === "eraser") {
        // Remove strokes near the eraser point
        const threshold = 20;
        const newStrokes = strokes.filter((stroke) => {
          return !stroke.points.some(
            (p) =>
              Math.abs(p.x - point.x) < threshold &&
              Math.abs(p.y - point.y) < threshold
          );
        });
        if (newStrokes.length !== strokes.length) {
          onStrokesChange(newStrokes);
        }
      } else {
        const newPoints = [...currentStroke, point];
        setCurrentStroke(newPoints);
        redrawCanvas(strokes, newPoints);
      }
    },
    [
      isDrawing,
      getCanvasPoint,
      tool,
      lassoPoints,
      currentStroke,
      strokes,
      onStrokesChange,
      redrawCanvas,
    ]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === "lasso" && lassoPoints.length > 2) {
      // Calculate bounding box of lasso selection
      const xs = lassoPoints.map((p) => p.x);
      const ys = lassoPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const canvas = canvasRef.current;
      if (canvas) {
        // First redraw without the lasso line to get clean capture
        redrawCanvas(strokes);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = maxX - minX;
          const height = maxY - minY;
          if (width > 10 && height > 10) {
            const imageData = ctx.getImageData(minX, minY, width, height);
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCtx.putImageData(imageData, 0, 0);
              const dataUrl = tempCanvas.toDataURL("image/png");
              const bounds = new DOMRect(minX, minY, width, height);
              onLassoSelect(dataUrl, bounds);
            }
          }
        }
      }
      setLassoPoints([]);
    } else if (tool === "pen" && currentStroke.length >= 2) {
      const newStroke: Stroke = {
        points: currentStroke,
        color: penColor,
        width: penWidth,
      };
      onStrokesChange([...strokes, newStroke]);
    }

    setCurrentStroke([]);
  }, [
    isDrawing,
    tool,
    lassoPoints,
    currentStroke,
    penColor,
    penWidth,
    strokes,
    onStrokesChange,
    onLassoSelect,
    redrawCanvas,
  ]);

  const colors = ["#1a1a1a", "#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c"];

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm border">
        {/* Tool selection */}
        <div className="flex gap-1">
          <button
            onClick={() => setTool("pen")}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              tool === "pen"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            ペン
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              tool === "eraser"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            消しゴム
          </button>
          <button
            onClick={() => setTool("lasso")}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              tool === "lasso"
                ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            AI投げなわ
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Colors */}
        {tool === "pen" && (
          <div className="flex gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setPenColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition ${
                  penColor === c ? "border-blue-500 scale-110" : "border-gray-200"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {/* Pen width */}
        {tool === "pen" && (
          <>
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

        {/* Lasso hint */}
        {tool === "lasso" && (
          <p className="text-sm text-amber-600">
            質問したい箇所を囲んでください
          </p>
        )}

        {/* Clear */}
        <div className="ml-auto">
          <button
            onClick={() => onStrokesChange([])}
            className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded transition"
          >
            全消去
          </button>
        </div>
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
