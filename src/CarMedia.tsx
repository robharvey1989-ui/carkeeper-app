import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import type { Car as CarType } from "@/hooks/useCars";
import ImageGalleryView from "@/components/ImageGalleryView";
import AddImagesDialog from "@/components/AddImagesDialog";
import CarStage from "@/components/CarStage";
import { getPrimaryImageUrl, getSortedImageUrls } from "@/lib/media";

export default function CarMedia() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [car, setCar] = useState<CarType | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!user?.id || !id) return;
    (async () => {
      const { data } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (!data) return navigate("/");
      const normalized: any = {
        ...(data as any),
        images: Array.isArray((data as any)?.images) ? (data as any).images : [],
      };
      setCar(normalized as CarType);
    })();
  }, [user?.id, id, navigate]);

  if (!car) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
        <div className="mt-6">Loading...</div>
      </div>
    );
  }

  const title = car.name || [car.make, car.model, car.year].filter(Boolean).join(" ") || "Untitled Car";
  const images = getSortedImageUrls(car);
  const cover = (images[idx] as string | undefined) || getPrimaryImageUrl(car) || "/placeholder.svg";

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
          </Button>
          <div className="text-lg font-semibold">{title} - Media</div>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add media
        </Button>
      </div>

      <div className="mb-6">
        <CarStage
          imageUrl={cover}
          title={`${title} cover`}
          onPrev={images.length > 1 ? () => setIdx((i) => (i - 1 + images.length) % images.length) : undefined}
          onNext={images.length > 1 ? () => setIdx((i) => (i + 1) % images.length) : undefined}
          variant="garage"
          fillBackground={false}
          frameless
        />
      </div>

      <ImageGalleryView
        car={car}
        onUpdated={async () => {
          const { data } = await supabase.from("cars").select("*").eq("id", car.id).single();
          if (data) setCar({ ...(data as any), images: (data as any).images ?? [] } as CarType);
        }}
      />

      <div className="mt-4">
        <AddImagesDialog
          carId={car.id}
          onUploaded={async () => {
            const { data } = await supabase.from("cars").select("*").eq("id", car.id).single();
            if (data) setCar({ ...(data as any), images: (data as any).images ?? [] } as CarType);
          }}
        />
      </div>
    </div>
  );
}
