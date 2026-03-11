import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  // accept any async creator to avoid type mismatch during dev
  onCreate: (input: any) => Promise<any>;
};

export default function AddCarDialog({ open, onOpenChange, onCreate }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [registration, setRegistration] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onCreate({
        make: make || undefined,
        model: model || undefined,
        registration: registration || null,
        year: year === "" ? null : Number(year),
        imageFile: coverFile ?? null,
      });
      // reset minimal fields after save
      setMake("");
      setModel("");
      setRegistration("");
      setYear("");
      setCoverFile(null);
      onOpenChange?.(false);
    } catch (e: any) {
      const msg = e?.message || String(e) || "Failed to save car";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Add a car</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/80 mb-1">Make</label>
              <input
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full rounded-md bg-white/[0.06] border border-white/15 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Porsche"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-1">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md bg-white/[0.06] border border-white/15 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="911 Carrera"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/80 mb-1">Reg</label>
                <input
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  className="w-full rounded-md bg-white/[0.06] border border-white/15 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AJ13 RFN"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Year</label>
                <input
                  value={year}
                  onChange={(e) =>
                    setYear(e.target.value ? Number(e.target.value) : "")
                  }
                  type="number"
                  className="w-full rounded-md bg-white/[0.06] border border-white/15 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2013"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={busy}>
                {busy ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-1">Feature image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/80 file:mr-4 file:rounded-md file:border file:border-white/15 file:bg-white/10 file:px-3 file:py-1.5 file:text-white/90 hover:file:bg-white/15"
            />
            {coverFile && (
              <div className="mt-2 text-xs text-white/60 truncate">{coverFile.name}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
