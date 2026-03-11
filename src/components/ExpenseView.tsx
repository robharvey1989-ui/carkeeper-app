import { useMemo, useState } from "react";
import type { Car } from "@/hooks/useCars";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExpenses } from "@/hooks/useExpenses";
import { Trash2, Download } from "lucide-react";

/**
 * Expense choices:
 *  - Repair, Other (free text)
 * Store final category as a string.
 */
const CHOICES = ["Repair", "Other"] as const;
type Choice = (typeof CHOICES)[number];
const formatGBP = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number.isFinite(value) ? value : 0);

export default function ExpenseView({ car }: { car: Car }) {
  const { items, addExpense, removeExpense, loading } = useExpenses(car.id);

  // quick add
  const [choice, setChoice] = useState<Choice>("Repair");
  const [other, setOther] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // filters
  const FILTERS = ["All", "Repair", "Other"] as const;
  type Filter = (typeof FILTERS)[number];
  const [filter, setFilter] = useState<Filter>("All");

  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const normalize = (c: Choice, o: string) =>
    c === "Other" ? (o.trim() || "Other") : c;

  const filtered = useMemo(() => {
    if (filter === "All") return rows;
    if (filter === "Other") {
      return rows.filter((r: any) => {
        const cat = (r.category || r.type || "").toString();
        return cat !== "Repair";
      });
    }
    return rows.filter((r: any) => (r.category || r.type) === filter);
  }, [rows, filter]);

  const total = useMemo(
    () =>
      filtered.reduce(
        (s: number, r: any) => s + Number(r.amount ?? r.cost ?? 0),
        0
      ),
    [filtered]
  );

  async function handleAdd() {
    if (saving) return;
    const category = normalize(choice, other);
    if (!category) return;

    setSaving(true);
    try {
      await addExpense({
        car_id: car.id,
        category,
        date,
        amount: amount ? Number(amount) : 0,
        description: notes || null,
      } as any);

      setChoice("Repair");
      setOther("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount("");
      setNotes("");
    } catch (e: any) {
      alert(e?.message ?? "Failed to add expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeExpense(id);
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete expense.");
    }
  }

  function exportCSV() {
    const headers = ["Date", "Category", "Amount", "Notes"];
    const lines = filtered
      .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""))
      .map((r: any) => [
        r.date ?? "",
        (r.category || r.type || "").toString(),
        String(Number(r.amount ?? r.cost ?? 0)),
        (r.description ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""'),
      ]);

    const csv =
      [headers, ...lines]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\r\n") + "\r\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `expenses_${car.reg_number || car.name || car.id}_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filter + summary + export */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={f === filter ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {filtered.length} items - {formatGBP(total)}
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV} title="Export current view to CSV">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Quick add */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-1">
              <Label className="text-xs">Type</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={choice}
                onChange={(e) => setChoice(e.target.value as Choice)}
              >
                {CHOICES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {choice === "Other" && (
              <div className="sm:col-span-2">
                <Label className="text-xs">Other (describe)</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Parking, Toll, Valet..."
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Date</Label>
              <Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs">Amount (£)</Label>
              <Input className="mt-1" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="sm:col-span-5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input className="mt-1" placeholder="Any details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="sm:col-span-5 flex justify-end">
              <Button onClick={handleAdd} disabled={saving}>{saving ? "Adding..." : "Add expense"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground py-6">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6">No matching expenses.</div>
        ) : (
          filtered
            .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""))
            .map((e: any) => (
              <Card key={e.id}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{e.category || e.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.date} - {formatGBP(Number(e.amount ?? e.cost ?? 0))}
                      {e.notes ? ` - ${e.notes}` : ""}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(e.id)} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}



