import { Card } from "@/components/ui/card";

export default function LegalDetailsCard({ car }: { car: any }) {
  const asText = (v?: any) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };

  const row = (k: string, v?: any) => (
    <div className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-b-0">
      <div className="text-xs uppercase tracking-wide text-white/60">{k}</div>
      <div className="text-sm font-medium ml-4 truncate max-w-[60%] text-right text-white">
        {asText(v) ?? "-"}
      </div>
    </div>
  );

  const motStatus = (() => {
    const d = car?.mot_expiry ? new Date(car.mot_expiry) : null;
    if (!d) return "Unknown";
    return d.getTime() >= Date.now() ? "Valid" : "Expired";
  })();

  return (
    <Card className="p-5 border-white/10 bg-white/[0.03] backdrop-blur-md lux-card">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Compliance</div>
        <div className="text-base font-semibold text-white">DVLA / Legal Details</div>
      </div>
      <div>
        {row("MOT Status", motStatus)}
        {row("MOT Expiry Date", car?.mot_expiry)}
        {row("Tax Due Date", car?.tax_due)}
        {row("V5C/Logbook Date", car?.logbook_date)}
        {row("Export marker", car?.export_marker)}
        {row("Vehicle type approval", car?.type_approval)}
        {row("Wheelplan", car?.wheelplan)}
        {row("Revenue weight", car?.revenue_weight)}
      </div>
    </Card>
  );
}
