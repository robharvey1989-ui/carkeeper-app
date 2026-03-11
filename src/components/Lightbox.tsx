// src/components/Lightbox.tsx
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export type MediaItem = { url: string; type: "image" | "video"; name?: string };

export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const current = items[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
      <button className="absolute top-4 right-4 text-white" onClick={onClose}>
        <X className="w-7 h-7" />
      </button>
      <button className="absolute left-4 text-white" onClick={() => onIndex((index - 1 + items.length) % items.length)}>
        <ChevronLeft className="w-10 h-10" />
      </button>
      <button className="absolute right-4 text-white" onClick={() => onIndex((index + 1) % items.length)}>
        <ChevronRight className="w-10 h-10" />
      </button>

      <div className="max-w-[90vw] max-h-[85vh]">
        {current?.type === "video" ? (
          <video src={current.url} controls className="max-w-full max-h-[85vh]" />
        ) : (
          <img src={current.url} alt={current?.name || "Media item"} className="max-w-full max-h-[85vh] object-contain" />
        )}
      </div>
    </div>
  );
}
