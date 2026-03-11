import { useDocuments } from "@/hooks/useDocuments";
import { useState, useRef } from "react";

export default function DocumentFolderView({ car }: { car: { id: string } }) {
  const { docs, loading, addFiles, removeDoc } = useDocuments(car.id);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      await addFiles(files);
    } catch (err: any) {
      alert(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Documents</div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            onChange={onPick}
            multiple
            className="hidden"
            id="doc-picker"
          />
          <label
            htmlFor="doc-picker"
            className={`px-3 py-2 rounded-md border cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}
          >
            {busy ? "Uploading..." : "Upload"}
          </label>
        </div>
      </div>

      {loading && <div className="opacity-70">Loading...</div>}

      {docs.length === 0 ? (
        <div className="text-sm opacity-70">No documents yet.</div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border p-2">
              <div className="flex-1 min-w-0">
                <div className="truncate">{d.name}</div>
                <div className="text-xs opacity-60 truncate">{d.mime_type ?? "—"}</div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <a
                  className="px-2 py-1 rounded-md border text-sm"
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    const { data, error } = await (await import("@/integrations/supabase/client")).supabase
                      .storage.from("car-documents")
                      .createSignedUrl(d.storage_path, 3600);
                    if (error || !data?.signedUrl) return alert("Could not get link");
                    window.open(data.signedUrl, "_blank");
                  }}
                >
                  Open
                </a>
                <button
                  className="px-2 py-1 rounded-md border text-sm"
                  onClick={() => removeDoc(d.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

