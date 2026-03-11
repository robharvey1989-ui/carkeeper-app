import { useMemo, useState } from "react";
import { useCarEvents, MaintenanceKind } from "@/hooks/useCarEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

const formatGBP = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number.isFinite(value) ? value : 0);

export default function MaintenancePanel({ carId }: { carId: string }) {
  const { items, loading, addEvent, removeEvent, total } = useCarEvents(carId);

  const [type, setType] = useState<MaintenanceKind>("Service");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalItems = items.length;
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (b.event_date || "").localeCompare(a.event_date || "")),
    [items]
  );

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await addEvent({
        car_id: carId,
        title: title || type,
        type,
        notes: notes || null,
        event_date: date,
        cost: cost === "" ? null : Number(cost),
      });
      setTitle("");
      setCost("");
      setNotes("");
      setType("Service");
      setDate(new Date().toISOString().slice(0, 10));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add maintenance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="text-sm text-white/70">Total Spent</div>
          <div className="text-2xl font-semibold text-white">{formatGBP(total)}</div>
          <Badge variant="outline" className="border-white/20 bg-white/5 text-white/80">
            {totalItems} records
          </Badge>
        </div>

        <form onSubmit={onAdd} className="grid gap-3 md:grid-cols-5 w-full">
          <div>
            <Label className="text-xs text-white/70">Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as MaintenanceKind)}>
              <SelectTrigger className="mt-1 border-white/15 bg-black/25 text-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Service">Service</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-white/70">Title</Label>
            <Input
              className="mt-1 border-white/15 bg-black/25 text-white placeholder:text-white/45"
              placeholder="e.g., Oil change"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs text-white/70">Date</Label>
            <Input
              type="date"
              className="mt-1 border-white/15 bg-black/25 text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="text-xs text-white/70">Cost (GBP)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 border-white/15 bg-black/25 text-white placeholder:text-white/45"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Adding..." : "Add record"}
            </Button>
          </div>

          <div className="md:col-span-5">
            <Label className="text-xs text-white/70">Notes (optional)</Label>
            <Textarea
              className="mt-1 min-h-[84px] border-white/15 bg-black/25 text-white placeholder:text-white/45"
              placeholder="Add context for future reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>
      </div>

      {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-200">{err}</div>}

      <div className="border-t border-white/10 pt-3">
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            No maintenance recorded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedItems.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-white/10 bg-black/25 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-white/60">{ev.event_date?.slice(0, 10)} - {ev.type}</div>
                  <div className="font-medium text-white truncate">{ev.title || ev.type}</div>
                  {ev.notes && <div className="text-sm text-white/80 mt-1 whitespace-pre-wrap">{ev.notes}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-semibold text-white">{ev.cost != null ? formatGBP(Number(ev.cost)) : "-"}</div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => removeEvent(ev.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
