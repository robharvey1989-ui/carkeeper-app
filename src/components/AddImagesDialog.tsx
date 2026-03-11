// src/components/AddImagesDialog.tsx
import { useState } from "react";
import { uploadCarImage, UploadedRecord } from "@/lib/storage";
import { removeBackground } from "@/lib/cutout";
import { Button } from "@/components/ui/button";

type Props = {
  carId: string;
  onUploaded?: (items: UploadedRecord[]) => void;
};

export default function AddImagesDialog({ carId, onUploaded }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleUpload() {
    if (!files || files.length === 0) return;
    setErr(null);
    setLoading(true);
    try {
      const results: UploadedRecord[] = [];
      for (const file of Array.from(files)) {
        // Try optional background removal first so the cutout becomes primary
        let used = false;
        try {
          const cut = await removeBackground(file);
          if (cut) {
            const cutFile = new File([cut], `${file.name.replace(/\.[^.]+$/, "")}-cutout.png`, { type: "image/png" });
            const rec = await uploadCarImage(carId, cutFile);
            results.push(rec);
            used = true;
          }
        } catch {}
        // Always also store the original after, in case we want it later
        const record = await uploadCarImage(carId, file);
        results.push(record);
      }
      onUploaded?.(results);
      setFiles(null);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="text-sm"
      />
      <Button onClick={handleUpload} disabled={loading || !files || files.length === 0}>
        {loading ? "Uploading…" : "Upload images"}
      </Button>
      {err && <span className="text-red-500 text-sm">{err}</span>}
    </div>
  );
}

