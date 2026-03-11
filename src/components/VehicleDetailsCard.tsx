import { Card } from "@/components/ui/card";

export default function VehicleDetailsCard({ car }: { car: any }) {
  const asText = (v?: any) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };

  const row = (k: string, v?: any) => {
    const val = asText(v);
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-b-0">
        <div className="text-xs uppercase tracking-wide text-white/60">{k}</div>
        <div className="text-sm font-medium ml-4 truncate max-w-[60%] text-right text-white">{val ?? "-"}</div>
      </div>
    );
  };

  return (
    <Card className="p-5 border-white/10 bg-white/[0.03] backdrop-blur-md lux-card">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Vehicle Data</div>
        <div className="text-base font-semibold text-white">Vehicle Details</div>
      </div>
      <div>
        {row("Brand", car?.make)}
        {row("Model", car?.model)}
        {row("First Registration", car?.original_reg_date)}
        {row("Year of manufacture", (car as any)?.year_of_manufacture)}
        {row("Registration", car?.registration || car?.reg || car?.reg_number)}
        {row("Colour", car?.original_color)}
        {row("Fuel", car?.fuel_type)}
        {row(
          "Cylinder capacity",
          (car as any)?.cylinder_capacity ? `${(car as any).cylinder_capacity} cc` : undefined
        )}
        {row(
          "CO2 emissions",
          (car as any)?.co2_emissions ? `${(car as any).co2_emissions} g/km` : undefined
        )}
      </div>
    </Card>
  );
}
