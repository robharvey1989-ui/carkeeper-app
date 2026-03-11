import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useServiceSchedules } from "@/hooks/useServiceSchedules";
import { formatDate } from "@/lib/dateFormat";

export default function ServiceSchedulesPanel({ carId }: { carId: string }) {
  const { items, loading, addSchedule, markDone, deleteSchedule } = useServiceSchedules(carId);
  const [name, setName] = useState("");
  const [months, setMonths] = useState<string>("");
  const [miles, setMiles] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lastDate, setLastDate] = useState<string>("");
  const [lastMiles, setLastMiles] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onAdd() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addSchedule({
        car_id: carId,
        name: name.trim(),
        interval_months: months ? Number(months) : null,
        interval_miles: miles ? Number(miles) : null,
        notes: notes.trim() || null,
        last_done_date: lastDate ? lastDate : null,
        last_done_miles: lastMiles ? Number(lastMiles) : null,
      } as any);
      setName(""); setMonths(""); setMiles(""); setNotes(""); setLastDate(""); setLastMiles("");
    } catch (err: any) {
      alert(err?.message || "Failed to save reminder");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-7">
          <input className="rounded-md border px-3 py-2 bg-background" placeholder="Schedule name (e.g., Annual Service)" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="rounded-md border px-3 py-2 bg-background" placeholder="Interval months" type="number" value={months} onChange={(e)=>setMonths(e.target.value)} />
          <input className="rounded-md border px-3 py-2 bg-background" placeholder="Interval miles" type="number" value={miles} onChange={(e)=>setMiles(e.target.value)} />
          <input className="rounded-md border px-3 py-2 bg-background" type="date" value={lastDate} onChange={(e)=>setLastDate(e.target.value)} />
          <input className="rounded-md border px-3 py-2 bg-background" placeholder="Last done miles" type="number" value={lastMiles} onChange={(e)=>setLastMiles(e.target.value)} />
          <input className="rounded-md border px-3 py-2 bg-background md:col-span-2" placeholder="Notes (optional)" value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={onAdd} disabled={busy || !name.trim()}>Add</Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-sm opacity-70">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-sm opacity-70">No schedules yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => {
            const nextDue = (() => {
              if (!s.interval_months) return null;
              const base = s.last_done_date ? new Date(s.last_done_date) : (s.created_at ? new Date(s.created_at) : new Date());
              const d = new Date(base.getTime());
              d.setMonth(d.getMonth() + (s.interval_months || 0));
              return d;
            })();
            const today = new Date();
            const daysLeft = nextDue ? Math.ceil((nextDue.getTime() - today.getTime()) / 86400000) : null;
            const badge = (() => {
              if (daysLeft == null) return null;
              if (daysLeft <= 0) return <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-300">Due</span>;
              if (daysLeft <= 30) return <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Soon</span>;
              return <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300">{daysLeft}d</span>;
            })();
            return (
              <li key={s.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center">
                    <span>{s.name}</span>
                    {badge}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.interval_months ? `${s.interval_months} mo` : null}
                    {s.interval_months && s.interval_miles ? " • " : ""}
                    {s.interval_miles ? `${s.interval_miles.toLocaleString()} mi` : null}
                    {(s.interval_months || s.interval_miles) ? " • " : ""}
                    Last done: {s.last_done_date ? formatDate(s.last_done_date) : "—"}
                    {s.last_done_miles != null ? ` @ ${s.last_done_miles.toLocaleString()} mi` : ""}
                    {nextDue ? ` • Next due: ${formatDate(nextDue)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={async ()=>{
                    const d = prompt("Completed date (YYYY-MM-DD)", new Date().toISOString().slice(0,10)) || "";
                    const m = prompt("Odometer (optional)", "");
                    if (!d) return;
                    try {
                      await markDone(s.id, d, m ? Number(m) : null);
                    } catch (err: any) {
                      alert(err?.message || "Failed to update reminder");
                    }
                  }}>Mark done</Button>
                  <Button size="sm" variant="destructive" onClick={async ()=>{
                    const ok = confirm("Delete this reminder? This cannot be undone.");
                    if (!ok) return;
                    try {
                      await deleteSchedule(s.id);
                    } catch (err: any) {
                      alert(err?.message || "Failed to delete reminder");
                    }
                  }}>Delete</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

