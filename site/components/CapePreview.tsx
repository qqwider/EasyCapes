"use client";

import { useEffect, useRef, useState } from "react";

interface CapePreviewProps {
  url: string;
  scale?: number;
  className?: string;
}

export default function CapePreview({ url, scale = 8, className }: CapePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = 10;
      const h = 16;
      canvas.width = w * scale;
      canvas.height = h * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sw = img.width / 64;
      const sh = img.height / 32;
      ctx.drawImage(img, 1 * sw, 1 * sh, w * sw, h * sh, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => !cancelled && setFailed(true);
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, scale]);

  if (failed) {
    return <div className="cape-placeholder">—</div>;
  }
  return <canvas ref={canvasRef} className={className ?? "cape-preview"} />;
}
