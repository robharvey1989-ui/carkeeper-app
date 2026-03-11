// src/components/EditCarDialog.tsx
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Car } from "@/hooks/useCars";
import useCars from "@/hooks/useCars";

type Props = {
  car: Car;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
};

export default function EditCarDialog({ car, open, onOpenChange, onSuccess }: Props) {
  const { updateCar } = useCars();

  const [make, setMake] = useState(car.make ?? "");
  const [model, setModel] = useState(car.model ?? "");
  const [year, setYear] = useState<number | "">(car.year ?? "");
  const [reg, setReg] = useState(car.reg_number ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMake(car.make ?? "");
    setModel(car.model ?? "");
    setYear(car.year ?? "");
    setReg(car.reg_number ?? "");
    setImageFile(null);
  }, [open, car]);

  function prettyReg(input: string) {
    return input.toUpperCase().replace(/\s+/g, " ").trim();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!make.trim() || !model.trim()) {
      alert("Please enter at least Make and Model.");
      return;
    }
    if (year !== "" && (year < 1900 || year > new Date().getFullYear() + 1)) {
      alert("Please enter a valid year.");
      return;
    }

    try {
      setSaving(true);
      await updateCar(car.id, {
        make: make || undefined,
        model: model || undefined,
        year: year === "" ? null : Number(year),
        reg_number: reg ? prettyReg(reg) : null,
        imageFile,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
          <DialogDescription className="sr-only">Update your car details</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="make">Make *</Label>
              <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 2025"
              />
            </div>
            <div>
              <Label htmlFor="reg">Registration</Label>
              <Input
                id="reg"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                placeholder="e.g. AU25 YXO"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="image">Replace feature image (optional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
