import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/dateFormat";

export default function StatusSummary({
  motExpiry,
  taxDue,
  emphasis = 'normal',
}: {
  motExpiry?: string | null;
  taxDue?: string | null;
  emphasis?: 'normal' | 'slightly-larger';
}) {
  const today = new Date();
  const motDate = motExpiry ? new Date(motExpiry) : null;
  const taxDate = taxDue ? new Date(taxDue) : null;

  const motState = motDate
    ? motDate.getTime() >= today.getTime()
      ? "Valid"
      : "Expired"
    : "Unknown";
  const taxState = taxDate
    ? taxDate.getTime() >= today.getTime()
      ? "Taxed"
      : "Overdue"
    : "Unknown";

  const larger = emphasis === 'slightly-larger';
  const chip = (
    label: string,
    value: string,
    sub?: string | null,
    onClick?: (() => void) | null
  ) => (
    <div
      className={`rounded-xl border bg-white/5 ${larger ? 'p-5' : 'p-4'} ${onClick ? "cursor-pointer hover:bg-white/10 transition-colors" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick || undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className={`${larger ? 'text-xl' : 'text-lg'} font-semibold`}>{value}</div>
      {sub ? <div className="text-xs opacity-70 mt-1">{sub}</div> : null}
    </div>
  );

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {chip("MOT", motState, motDate ? formatDate(motDate) : null)}
        {chip("Tax", taxState, taxDate ? formatDate(taxDate) : null)}
      </div>
    </Card>
  );
}




