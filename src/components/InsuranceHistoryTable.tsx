import { Card } from "@/components/ui/card";
import { useExpenses } from "@/hooks/useExpenses";

export default function InsuranceHistoryTable({ carId }: { carId: string }) {
  const { items } = useExpenses(carId);
  const rows = items.filter((i) => String(i.category).toLowerCase() === "insurance");

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="text-sm font-medium mb-2">Insurance History</div>
      <table className="min-w-[640px] w-full text-sm">
        <thead className="text-left opacity-70">
          <tr>
            <th className="py-2 pr-4">Provider</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Renewal date</th>
            <th className="py-2 pr-4">Cost</th>
            <th className="py-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="py-4 opacity-70">No insurance records yet.</td></tr>
          ) : rows.map((r) => {
            const provider = (r.description || "").split("-")[0]?.trim() || "Insurance";
            const type = (r.description || "").split("-")[1]?.trim() || "—";
            const status = (() => {
              const d = new Date(r.date);
              return d.getTime() >= Date.now() ? "Active" : "Expired";
            })();
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">{provider}</td>
                <td className="py-2 pr-4">{type}</td>
                <td className="py-2 pr-4">{r.date}</td>
                <td className="py-2 pr-4">�{Number(r.amount || 0).toFixed(2)}</td>
                <td className="py-2 pr-4">{r.created_at ? new Date(r.created_at).toISOString().slice(0,10) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}


