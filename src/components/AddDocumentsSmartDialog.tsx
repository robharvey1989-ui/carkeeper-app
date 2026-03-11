// src/components/AddDocumentsSmartDialog.tsx
import { useState } from "react";
import { uploadCarDocument, UploadedRecord } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromImage, extractTextFromPDF } from "@/lib/ocr";
import { parseReceiptHeuristics } from "@/lib/parseReceipt";
import { useExpenses } from "@/hooks/useExpenses";

type Props = {
  carId: string;
  onUploaded?: (items: UploadedRecord[]) => void;
};

export default function AddDocumentsSmartDialog({ carId, onUploaded }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tags, setTags] = useState<string>("");
  const [expiresOn, setExpiresOn] = useState<string>("");
  const [autoParse, setAutoParse] = useState<boolean>(false);
  const { addExpense } = useExpenses(carId);

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

        if (autoParse) {
          try {
            let text: string | undefined;
            if (file.type.includes("image")) {
              const res = await extractTextFromImage(file);
              text = res?.text || undefined;
            } else if (file.type.includes("pdf")) {
              const res = await extractTextFromPDF(file);
              text = res?.text || undefined;
            }
            const parsed = parseReceiptHeuristics(text, file.name);
            if (parsed.amount != null && parsed.date) {
              await addExpense({
                car_id: carId,
                category: (parsed.category as any) || 'Other',
                description: parsed.description || record.name || 'Receipt',
                amount: parsed.amount,
                date: parsed.date,
              } as any);
            }
          } catch {
            // ignore OCR/parse failures for now
          }
        }
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
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.heic,.webp,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,text/plain"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="text-sm"
      />
      <div className="flex items-center gap-2 text-xs">
        <label className="opacity-80">Auto-parse receipt</label>
        <input type="checkbox" checked={autoParse} onChange={(e) => setAutoParse(e.target.checked)} />
      </div>
      <Button onClick={handleUpload} disabled={loading || !files || files.length === 0}>{loading ? "Uploading..." : "Upload documents"}</Button>
      <input type="text" placeholder="Tags (comma separated)" className="text-sm rounded-md border px-3 py-2 bg-background" value={tags} onChange={(e) => setTags(e.target.value)} />
      <input type="date" className="text-sm rounded-md border px-3 py-2 bg-background" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
      {err && <span className="text-red-500 text-sm">{err}</span>}
    </div>
  );
}


