import { useExpenses } from "@/hooks/useExpenses";

export default function CostSummary({ carId, currency }: { carId: string; currency?: "GBP" | "USD" | "EUR" }) {
  const { items, total } = useExpenses(carId);
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : "\u00A3";

  return (
    <div className="rounded-xl border p-4">
      <div className="font-medium mb-1">Costs</div>
      <div className="text-2xl font-semibold">{symbol}{total.toFixed(2)}</div>
      <div className="text-xs opacity-70">
        {items.length} expense{items.length !== 1 ? "s" : ""} tracked
      </div>
    </div>
  );
}
