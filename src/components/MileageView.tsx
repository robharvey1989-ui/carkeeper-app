import { useState, useMemo, useEffect } from "react";
import { useMileage } from "@/hooks/useMileage";
import type { Car } from "@/hooks/useCars";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/Loading";
import { useVehicleGovData } from "@/hooks/useVehicleGovData";

export default function MileageView({ car }: { car: Car }) {
  const { items, loading, error, add, remove } = useMileage(car.id);
  const [form, setForm] = useState({ date: "", odometer: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const latest = useMemo(() => (items.length ? items[items.length - 1].odometer : null), [items]);
  const vrm = (car.reg_number || (car as any).registration || (car as any).reg || '').toString() || undefined;
  const { data: govData } = useVehicleGovData(vrm);

  // Prefill odometer with the best known value when empty
  useEffect(() => {
    if (form.odometer && String(form.odometer).trim() !== "") return;
    const mot = govData?.lastMotMileage ?? null;
    const best = [latest ?? null, mot ?? null].filter((v): v is number => v != null && Number.isFinite(v)).reduce<number | null>((acc, v) => (acc == null || v > acc ? v : acc), null);
    if (best != null) setForm((f) => ({ ...f, odometer: String(best) }));
  }, [latest, govData?.lastMotMileage, form.odometer]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await add({
        date: form.date || undefined,
        odometer: Number(form.odometer || 0),
        notes: form.notes || null,
      });
      setForm({ date: "", odometer: "", notes: "" });
    } finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mileage {latest != null ? `(latest: ${latest})` : ""}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})} />
          </div>
          <div>
            <Label>Odometer</Label>
            <Input inputMode="numeric" value={form.odometer} onChange={(e)=>setForm({...form, odometer:e.target.value})} required />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add log"}</Button>
          </div>
        </form>

        {loading ? <Loading /> : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No mileage logs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr><th className="py-2">Date</th><th>Odometer</th><th>Notes</th><th></th></tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.date}</td>
                    <td>{r.odometer}</td>
                    <td className="max-w-[28ch] truncate">{r.notes ?? "—"}</td>
                    <td className="text-right">
                      <Button variant="outline" size="sm" onClick={()=>remove(r.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

