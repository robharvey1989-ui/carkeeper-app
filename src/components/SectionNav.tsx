import { cn } from "@/lib/utils";
import {
  CarFront,
  Image as ImageIcon,
  Wrench,
  Calendar as CalendarIcon,
  FileText,
  History,
} from "lucide-react";

export type SectionKey =
  | "details"
  | "media"
  | "maintenance"
  | "timeline"
  | "documents"
  | "reminders";

const items: { key: SectionKey; label: string; Icon: any }[] = [
  { key: "details", label: "Details", Icon: CarFront },
  { key: "media", label: "Images", Icon: ImageIcon },
  { key: "maintenance", label: "Care", Icon: Wrench },
  { key: "documents", label: "Documents", Icon: FileText },
  { key: "reminders", label: "Reminders", Icon: CalendarIcon },
  { key: "timeline", label: "History", Icon: History },
];

export default function SectionNav({
  value,
  onChange,
  className,
}: {
  value?: SectionKey | null;
  onChange: (k: SectionKey) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-1.5 sm:p-2 flex flex-wrap gap-1.5 sm:gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)] lux-card",
        className
      )}
      aria-label="Sections"
    >
      {items.map(({ key, label, Icon }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            className={cn(
              "group inline-flex items-center gap-2 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm transition-all duration-300 lux-press",
              active
                ? "bg-white text-slate-900 shadow-sm shadow-black/20"
                : "hover:bg-white/10 text-white/80 hover:text-white"
            )}
            onClick={() => onChange(key)}
          >
            <Icon className={cn("h-4 w-4", active ? "opacity-100" : "opacity-80")} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
