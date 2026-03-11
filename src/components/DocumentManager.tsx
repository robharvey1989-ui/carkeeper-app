import React, { useState } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Trash, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { carId?: string };

export default function DocumentManager({ carId }: Props) {
  const { docs, loading, addFiles, removeDoc } = useDocuments(carId);
  const [uploading, setUploading] = useState(false);

  if (!carId) return null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await addFiles([file]);
    } catch (err: any) {
      alert(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents</h2>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} />
          <Button disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
        </label>
      </div>

      {/* Hook currently does not expose error; show loading/empty/data states */}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((doc) => {
            return (
              <li key={doc.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <SignedLink storagePath={doc.storage_path} name={doc.name || "Document"} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDoc(doc.id)}
                  title="Delete"
                >
                  <Trash className="w-4 h-4 text-red-600" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SignedLink({ storagePath, name }: { storagePath: string; name: string }) {
  const [href, setHref] = React.useState<string>("#");
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.storage
          .from("car-documents")
          .createSignedUrl(storagePath, 3600);
        if (mounted && data?.signedUrl) setHref(data.signedUrl);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [storagePath]);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline truncate"
      title={name}
    >
      {name}
    </a>
  );
}

