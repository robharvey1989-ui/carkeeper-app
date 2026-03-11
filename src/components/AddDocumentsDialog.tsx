// src/components/AddDocumentsDialog.tsx
import { useState } from "react";
import { uploadCarDocument, UploadedRecord } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  carId: string;
  onUploaded?: (items: UploadedRecord[]) => void;
};

export default function AddDocumentsDialog({ carId, onUploaded }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tags, setTags] = useState<string>("" );
  const [expiresOn, setExpiresOn] = useState<string>("" );

  async function handleUpload() {
    if (!files || files.length === 0) return;
    setErr(null);
    setLoading(true);
    try {
      const results: UploadedRecord[] = [];
      for (const file of Array.from(files)) {
        const record = await uploadCarDocument(carId, file);
        // optional tags/expiry update if supported
        const payload: any = {};
        const parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
        if (parsedTags.length > 0) payload.tags = parsedTags;
        if (expiresOn) payload.expires_on = expiresOn;
        if (Object.keys(payload).length > 0) {
          try { await supabase.from("car_documents").update(payload).eq("id", record.id); } catch {}
        }
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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.heic,.webp,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,text/plain"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="text-sm"
      />
      <Button onClick={handleUpload} disabled={loading || !files || files.length === 0}>{loading ? "Uploading…" : "Upload documents"}</Button>
      <input type="text" placeholder="Tags (comma separated)" className="text-sm rounded-md border px-3 py-2 bg-background" value={tags} onChange={(e) => setTags(e.target.value)} />
      <input type="date" className="text-sm rounded-md border px-3 py-2 bg-background" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
      {err && <span className="text-red-500 text-sm">{err}</span>}
    </div>
  );
}







