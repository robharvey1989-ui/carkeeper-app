import { useEffect, useRef, useState } from "react";
import type { Car } from "@/hooks/useCars";
import useCars from "@/hooks/useCars";
import { Button } from "@/components/ui/button";

export default function NotesView({ car }: { car: Car }) {
  const { updateCar } = useCars();
  const [value, setValue] = useState(car.notes ?? "");
  const [saving, setSaving] = useState<"idle"|"saving"|"saved">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setValue(car.notes ?? "");
  }, [car.id, car.notes]);

  async function saveNow(v: string) {
    try {
      setSaving("saving");
      await updateCar(car.id, { notes: v });
      setSaving("saved");
      window.setTimeout(() => setSaving("idle"), 1000);
    } catch (e: any) {
      setSaving("idle");
      alert(e?.message ?? "Failed to save notes");
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);
    // autosave after 800ms idle
    timer.current = window.setTimeout(() => saveNow(v), 800) as unknown as number;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        Free-form notes for this car. Autosaves after you stop typing.
      </div>
      <textarea
        value={value}
        onChange={onChange}
        rows={10}
        placeholder="Write anything..."
        className="w-full rounded-md border bg-background p-3 leading-6"
      />
      <div className="text-xs text-muted-foreground">
        {saving === "saving" ? "Saving..." : saving === "saved" ? "Saved" : " "}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setValue(car.notes ?? "")}>
          Revert
        </Button>
        <Button onClick={() => saveNow(value)}>Save now</Button>
      </div>
    </div>
  );
}

