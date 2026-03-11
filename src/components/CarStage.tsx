import { ChevronLeft, ChevronRight, Camera, RotateCcw, Play, Pause } from "lucide-react";
import { useRef, useState } from "react";
import type React from "react";

type Props = {
  imageUrl: string;
  title?: string;
  onPrev?: () => void;
  onNext?: () => void;
  compact?: boolean; // hides arrows and control pills when true
  variant?: "default" | "garage"; // background styling
  backgroundUrl?: string; // optional photographic background layer
  fillBackground?: boolean; // render wall/background inside the stage (set false for hero)
  frameless?: boolean; // remove rounded container/overflow to kill the visible box
};

export default function CarStage({ imageUrl, title, onPrev, onNext, compact, variant = "garage", backgroundUrl, fillBackground = true, frameless = false }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, tx: 0, ty: 0 });

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const nx = (x - 0.5) * 2;
    const ny = (y - 0.5) * 2;
    const maxTilt = 2; // deg
    const maxShift = 6; // px
    setTilt({ rx: -ny * maxTilt, ry: nx * maxTilt, tx: nx * maxShift, ty: ny * maxShift });
  }
  function onLeave() { setTilt({ rx: 0, ry: 0, tx: 0, ty: 0 }); }

  const rootClass = [
    "am-showroom",
    variant === "garage" ? "am-garage" : "",
    compact ? "am-compact" : "",
    frameless ? "am-frameless" : "",
    frameless ? "overflow-visible" : "rounded-2xl overflow-hidden",
    "relative",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={rootClass}>
      {fillBackground && backgroundUrl ? (
        <div className="am-bg-img" style={{ backgroundImage: `url(${backgroundUrl})` }} aria-hidden />
      ) : null}
      {/* Carousel left/right */}
      {!compact && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={onPrev}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/55 text-white items-center justify-center backdrop-blur-md border border-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={onNext}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/55 text-white items-center justify-center backdrop-blur-md border border-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Floor / stage */}
      <div className="am-floor" aria-hidden />
      <div className="am-sheen" aria-hidden />

      {/* Car image */}
      <img
        src={imageUrl}
        alt={title || "Car"}
        className="am-car-image select-none"
        draggable={false}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
        style={{ transform: `translateX(-50%) translate3d(${tilt.tx}px, ${tilt.ty}px, 0) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
      />

      {/* Bottom control pills */}
      {!compact && (
        <div className="am-pills">
          <button className="am-pill am-pill-muted" title="Snapshots">
            <Camera className="w-4 h-4" />
          </button>
          <button className="am-pill am-pill-muted" title="Reset view">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button className="am-pill am-pill-muted" title="Play">
            <Play className="w-4 h-4" />
          </button>
          <button className="am-pill am-pill-muted" title="Pause">
            <Pause className="w-4 h-4" />
          </button>

          {/* Spacer */}
          <div className="w-3" />

          {/* Mode toggles - 2D active for now */}
          <button className="am-pill am-pill-muted">2D</button>
          <button className="am-pill">3D</button>
        </div>
      )}
    </div>
  );
}


