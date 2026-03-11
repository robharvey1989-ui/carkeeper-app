// src/components/ImageGalleryView.tsx
import { useEffect, useState } from "react";
import Lightbox, { MediaItem } from "./Lightbox";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function ImageGalleryView({ car, onUpdated }: { car: any; onUpdated?: () => void }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Resolve URLs; if storage_path is present (private bucket), create signed URLs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const imgs = Array.isArray(car?.images) ? car.images : [];
      const out: MediaItem[] = [];
      for (const m of imgs) {
        let url = m?.url as string | undefined;
        const name = m?.name as string | undefined;
        const type = (m?.type as string | undefined)?.startsWith("video/") ? "video" : "image";
        const storagePath = (m as any)?.storage_path as string | undefined;
        try {
          if (storagePath) {
            // Try primary bucket then fallback to legacy bucket name
            const tryBuckets = async () => {
              const attempt = async (bucket: string) => {
                const { data, error } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(storagePath, 3600);
                if (!error && data?.signedUrl) return data.signedUrl;
                return undefined;
              };
              return (await attempt("car-images")) || (await attempt("images"));
            };
            const signed = await tryBuckets();
            if (signed) url = signed;
          }
        } catch {}
        if (url) out.push({ url, name, type: (type as any) || "image" });
      }
      if (!cancelled) setMedia(out);
    })();
    return () => { cancelled = true; };
  }, [car?.images]);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {media.map((m, i) => (
          <div key={m.url + i} className="relative group aspect-video rounded-lg overflow-hidden bg-muted">
            <button
              onClick={() => { setIndex(i); setOpen(true); }}
              className="absolute inset-0"
              title={m.name}
            />
            {m.type === "video" ? (
              <video src={m.url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={m.url} alt={m.name || "Car media"} className="w-full h-full object-cover" />
            )}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="outline"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const images = Array.isArray(car.images) ? [...car.images] : [];
                    const sel = images[i];
                    if (!sel) return;
                    const reordered = [sel, ...images.filter((_, idx) => idx !== i)];
                    const { error } = await supabase
                      .from('cars')
                      .update({ images: reordered, updated_at: new Date().toISOString() })
                      .eq('id', car.id);
                    if (!error) {
                      if (onUpdated) onUpdated(); else window.location.reload();
                    }
                  } catch (err) {
                    // swallow for now
                  }
                }}
              >
                Set cover
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmIndex(i);
                  setConfirmOpen(true);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Lightbox
          items={media}
          index={index}
          onClose={() => setOpen(false)}
          onIndex={(i) => setIndex(i)}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete image?</DialogTitle>
            <DialogDescription>Removing will delete it from this car{String('')} and attempt to remove the stored file.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (confirmIndex == null) return;
                setDeleting(true);
                try {
                  const images = Array.isArray(car.images) ? [...car.images] : [];
                  const sel = images[confirmIndex] as any;
                  if (sel) {
                    const storagePath: string | undefined = sel?.storage_path;
                    if (storagePath) {
                      try { await supabase.storage.from('car-images').remove([storagePath]); } catch {}
                      try { await supabase.storage.from('images').remove([storagePath]); } catch {}
                    }
                    const remaining = images.filter((_, idx) => idx !== confirmIndex);
                    const { error } = await supabase
                      .from('cars')
                      .update({ images: remaining, updated_at: new Date().toISOString() })
                      .eq('id', car.id);
                    if (!error) {
                      setConfirmOpen(false);
                      setConfirmIndex(null);
                      if (onUpdated) onUpdated(); else window.location.reload();
                    }
                  }
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
