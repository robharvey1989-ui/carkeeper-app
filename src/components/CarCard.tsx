// src/components/CarCard.tsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getPrimaryImageUrl } from "@/lib/media";

type Img = { url: string };
type CarLike = {
  id: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  reg_number?: string | null;
  name?: string | null;
  images?: Img[] | null;
};

export default function CarCard({ car, index }: { car: CarLike; index: number }) {
  const nav = useNavigate();
  const title = `${car.make ?? ""} ${car.model ?? ""}`.trim();
  const cover = getPrimaryImageUrl(car as any) || "/placeholder.svg";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.03 * index }}
      whileHover={{ y: -4 }}
      className="group rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200 hover:shadow-[0_16px_50px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => nav(`/car/${car.id}`)}
      role="button"
      aria-label={`Open ${title || "car"}`}
    >
      <div className="relative aspect-video bg-muted">
        <img
          src={cover}
          alt={title || "Car image"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 ease-gentle group-hover:scale-[1.03]"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
        />
        {/* no overlays to keep image perfectly clear */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          {car.year && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 backdrop-blur border border-white/10">
              {car.year}
            </span>
          )}
          {car.reg_number && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 backdrop-blur border border-white/10">
              {car.reg_number}
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="text-white/90 font-medium">{title || "Car"}</div>
        {car.name && <div className="text-white/50 text-sm mt-1">{car.name}</div>}
      </div>
    </motion.div>
  );
}
